/* Dabbu Files API Server - gmail.js
 * Copyright (C) 2021	gamemaker1
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.	If not, see <https://www.gnu.org/licenses/>.
 */

// MARK: Imports

// Used to store the files generated from a thread
const fs = require('fs-extra')
// Used to make HTTP request to the Google Drive API endpoints
const axios = require('axios').default
// Used to bundle threads with attachments into zips
const archiver = require('archiver')

// To convert html to markdown
const breakdance = require('breakdance')

// Custom errors we throw
const {
	NotFoundError,
	UnauthorizedError,
	MissingParamError
} = require('../errors.js')
// Used sort the files retrieved based on query parameters
const { sortFiles, diskPath, cachePath } = require('../utils.js')

// Import the default Provider class we need to extend
const Provider = require('./provider.js').default

// MARK: Functions

// Get the thread ID from a file name (the file names are in
// the format `{date} - {threadID} - {subject}`)
function getThreadIDFromName(name) {
	const splitName = name.split('-')
	if (splitName.length === 1) {
		return name
	}

	if (splitName.length >= 2) {
		return splitName[1].trim()
	}
}

// Get a label from a folder path
async function getLabelsFromName(instance, name) {
	if (name.toLowerCase() === 'null' || name.toLowerCase() === '/') {
		return null
	}

	// Each folder name is a label. Multiple folder names are interpreted
	// as an AND query
	const labelNames = name.split('/')
	const labels = []

	const labelsResult = await instance.get('/gmail/v1/users/me/labels')
	for (let i = 0, { length } = labelNames; i < length; i++) {
		const labelName = labelNames[i]
		// If there is a result, parse it
		if (labelsResult.data && labelsResult.data.labels) {
			// Loop through the labels
			for (const label of labelsResult.data.labels) {
				if (label.name === labelName) {
					labels.push(label.id)
				}
			}
		}
	}

	return labels
}

// Format a date to YYYYMMDD
function formatDate(unformattedDate) {
	const date = new Date(unformattedDate)
	let month = `${date.getMonth() + 1}`
	let day = `${date.getDate()}`
	const year = `${date.getFullYear()}`

	if (month.length < 2) {
		month = `0${month}`
	}

	if (day.length < 2) {
		day = `0${day}`
	}

	return `${year}${month}${day}`
}

// Helper functions for parsing the thread's messages
// Some parts are taken from https://github.com/EmilTholin/gmail-api-parse-message/

// Convert a message's headers to simpler key-value pairs
function indexHeaders(headers) {
	if (!headers) {
		return {}
	}

	const result = {}
	for (const header of headers) {
		result[header.name.toLowerCase()] = header.value
	}

	return result
}

// Parse a Gmail message and return a nice object
function parseGmailMessage(message) {
	// Get the message ID, thread ID, label IDs (though only thread ID is needed)
	const result = {
		id: message.id,
		threadId: message.threadId,
		labelIds: message.labelIds
	}

	// The message payload (contains body and attachments)
	const { payload } = message
	if (!payload) {
		return result
	}

	// The headers, contains the subject, date, from and to emails
	let headers = indexHeaders(payload.headers)

	// Parse the subject, date, from and to emails from the headers
	result.subject = headers.subject === '' ? '(No subject)' : headers.subject
	result.date = headers.date
	result.from = headers.from
	result.to = headers.to

	// The message is usually divided into parts
	let parts = [payload]
	let firstPartProcessed = false

	// Keep going through the parts
	while (parts.length > 0) {
		// Get the first part and then remove it from the array
		const part = parts.shift()

		// If this part contains subparts, add those subparts
		// to the array
		if (part.parts) {
			parts = [...parts, ...part.parts]
		}

		// Get the headers only if this is not the first part
		if (firstPartProcessed) {
			headers = indexHeaders(part.headers)
		}

		// If there is no body, skip this part
		if (!part.body) {
			continue
		}

		// Is the part made up of html
		const isHtml = part.mimeType && part.mimeType.includes('text/html')
		// Is the part made up of plain text
		const isPlain = part.mimeType && part.mimeType.includes('text/plain')
		// Does the part point to an attachment
		const isAttachment = Boolean(
			part.body.attachmentId ||
				(headers['content-disposition'] &&
					headers['content-disposition'].toLowerCase().includes('attachment'))
		)
		// Is the part an inline attachment
		const isInline =
			headers['content-disposition'] &&
			headers['content-disposition'].toLowerCase().includes('inline')

		if (isHtml && !isAttachment) {
			// Convert the html to markdown and add it to the result
			result.text = breakdance(Buffer.from(part.body.data, 'base64').toString())
				// Replace br tags with a newline and u tags with underline, as
				// breakdance doesn't do that
				.replace(/<br>/g, '\n')
				.replace(/<\/br>/g, '\n')
				.replace(/<\/u>/g, '_')
				.replace(/<\/u>/g, '_')
		} else if (isPlain && !isAttachment) {
			// Add the plain text to the result
			result.text = Buffer.from(part.body.data, 'base64').toString('ascii')
		} else if (isAttachment) {
			// If it is an attachment, return the metadata so we can
			// fetch the attachment

			const { body } = part
			if (!result.attachments) {
				result.attachments = []
			}

			result.attachments.push({
				filename: part.filename,
				mimeType: part.mimeType,
				size: body.size,
				attachmentId: body.attachmentId,
				headers: indexHeaders(part.headers)
			})
		} else if (isInline) {
			// If it is an attachment, return the metadata so we can
			// fetch the attachment

			const { body } = part
			if (!result.inline) {
				result.inline = []
			}

			result.inline.push({
				filename: part.filename,
				mimeType: part.mimeType,
				size: body.size,
				attachmentId: body.attachmentId,
				headers: indexHeaders(part.headers)
			})
		}

		firstPartProcessed = true
	}

	// Return succesfully
	return result
}

// Our special function to get all the messages in a thread, and their
// attachments, and send back a download URL
async function createMailDataURI(instance, threadData) {
	// Store the file paths in which the messages have been stored
	const messagePaths = []
	// Store the file paths in which the attachments have been stored
	const attachmentPaths = []
	// The final archive name
	let archiveName = ''
	// Loop through the messages
	for (let i = 0, { length } = threadData.messages; i < length; i++) {
		// Parse the message
		const message = parseGmailMessage(threadData.messages[i])

		// Generate the file name based on the parsed message => `YYYYMMDD - {thread ID} - {subject}`
		const messageFileName = `${formatDate(message.date)} - ${
			message.threadId
		} - ${message.subject}`
		archiveName = messageFileName

		// Create the directories which contain the generated and zip files
		// eslint-disable-next-line no-await-in-loop
		await fs.ensureDir('./_dabbu/_server/_gmail/generated/')
		// eslint-disable-next-line no-await-in-loop
		await fs.ensureDir('./_dabbu/_server/_gmail/zips/')

		// Show the attachments and inline stuff in a nice way at the
		// end of the file
		let attachmentsText = ''
		let inlineText = ''
		if (message.attachments) {
			for (let j = 0, { length } = message.attachments; j < length; j++) {
				const attachment = message.attachments[j]
				// First add the text to the message file
				attachmentsText += [
					`${attachment.filename}:`,
					` - mimeType: ${attachment.mimeType}`,
					` - size: ${attachment.size}\n`
				].join('\n')
				// Then fetch the attachment
				// Surround in try-catch block as we don't want one failed result to
				// kill the entire operation
				try {
					// Get the attachment as a base64 encoded string
					// eslint-disable-next-line no-await-in-loop
					const attachmentResult = await instance.get(
						`/gmail/v1/users/me/messages/${message.id}/attachments/${attachment.attachmentId}`
					)
					if (attachmentResult.data && attachmentResult.data.data) {
						// Write the attachment data to a file
						// eslint-disable-next-line no-await-in-loop
						await fs.writeFile(
							`./_dabbu/_server/_gmail/generated/${messageFileName} - ${attachment.filename}`,
							Buffer.from(attachmentResult.data.data, 'base64')
						)
						// Add the file path and name to the array
						attachmentPaths.push({
							name: `${messageFileName} - ${attachment.filename}`,
							path: `./_dabbu/_server/_gmail/generated/${messageFileName} - ${attachment.filename}`
						})
					} else {
						// No data
						attachmentsText += 'Failed to fetch attachment'
					}
				} catch (error) {
					// Some error occurred, tell the user
					attachmentsText += `Failed to fetch attachment: ${error.message}\n`
				}
			}
		} else {
			attachmentsText = 'No attachments found'
		}

		if (message.inline) {
			for (let j = 0, { length } = message.inline; j < length; j++) {
				const attachment = message.inline[j]
				// First add the text to the message file
				inlineText += [
					`${attachment.filename}:`,
					` - mimeType: ${attachment.mimeType}`,
					` - size: ${attachment.size}\n`
				].join('\n')
				// Then fetch the attachment
				// Surround in try-catch block as we don't want one failed result to
				// kill the entire operation
				try {
					// Get the attachment as a base64 encoded string
					// eslint-disable-next-line no-await-in-loop
					const attachmentResult = await instance.get(
						`/gmail/v1/users/me/messages/${message.id}/attachments/${attachment.attachmentId}`
					)
					if (attachmentResult.data && attachmentResult.data.data) {
						// Write the attachment data to a file
						// eslint-disable-next-line no-await-in-loop
						await fs.writeFile(
							`./_dabbu/_server/_gmail/generated/${messageFileName} - ${
								i + 1
							} - ${attachment.filename}`,
							Buffer.from(attachmentResult.data.data, 'base64')
						)
						// Add the file path and name to the array
						attachmentPaths.push({
							name: `${messageFileName} - ${i + 1} - ${attachment.filename}`,
							path: `./_dabbu/_server/_gmail/generated/${messageFileName} - ${
								i + 1
							} - ${attachment.filename}`
						})
					} else {
						// No data
						attachmentsText += 'Failed to fetch attachment'
					}
				} catch (error) {
					// Some error occurred, tell the user
					attachmentsText += `Failed to fetch attachment: ${error.message}\n`
				}
			}
		} else {
			inlineText = 'No inline attachments found'
		}

		// Write the data to the file
		// eslint-disable-next-line no-await-in-loop
		await fs.writeFile(
			`./_dabbu/_server/_gmail/generated/${messageFileName} - ${i + 1}.md`,
			[
				'---',
				`subject: ${message.subject}`,
				`date: ${message.date}`,
				`from: ${message.from}`,
				`to: ${message.to}`,
				'--',
				'',
				`${(message.text || '(No body)').replace(/ {2}\n/g, '')}`,
				'',
				'--',
				'Attachments:',
				`${attachmentsText}`,
				'--',
				'Inline attachments:',
				`${inlineText}`
			].join('\n')
		)

		messagePaths.push({
			name: `${messageFileName} - ${i + 1}.md`,
			path: `./_dabbu/_server/_gmail/generated/${messageFileName} - ${i + 1}.md`
		})
	}

	// Pack it all in a zip file
	await fs.createFile(`./_dabbu/_server/_gmail/zips/${archiveName}.zip`)
	const output = fs.createWriteStream(
		`./_dabbu/_server/_gmail/zips/${archiveName}.zip`
	)
	const archive = archiver('zip', {
		zlib: { level: 9 } // Sets the compression level.
	})

	// Now append files to the archive
	// First add the messages
	for (let k = 0, { length } = messagePaths; k < length; k++) {
		// Get the path and name object
		const message = messagePaths[k]

		// Add the data to the archive
		archive.file(message.path, { name: message.name })
	}

	// Then append the attachments, if any
	for (let k = 0, { length } = attachmentPaths; k < length; k++) {
		// Get the path and name object
		const attachment = attachmentPaths[k]

		// Add the data to the archive
		archive.file(attachment.path, { name: attachment.name })
	}

	return new Promise((resolve, reject) => {
		// Once the file is written, return
		output.on('close', () => {
			resolve(cachePath(`/_gmail/zips/${archiveName}.zip`))
		})

		// Catch errors
		archive.on('error', (error) => {
			reject(error)
		})

		// Finalize the contents
		archive.finalize()

		// Pipe archive data to the file
		archive.pipe(output)
	})
}

// MARK: Provider

class GmailProvider extends Provider {
	async list(body, headers, parameters, queries) {
		// Get the access token from the header
		const accessToken = headers.Authorization || headers.authorization
		// If there is no access token, return a 401 Unauthorised error
		if (!accessToken) {
			throw new UnauthorizedError('No access token specified')
		}

		// Create an axios instance with the header. All requests will be made with this
		// instance so the headers will be present everywhere
		const instance = axios.create({
			baseURL: 'https://gmail.googleapis.com/',
			headers: { Authorization: accessToken }
		})

		// Get the export type and compare/sort params from the query parameters
		const { compareWith, operator, value, orderBy, direction } = queries

		// If the request is for / (the root folder), then return a list
		// of all labels. Else return the list of threads with that label
		let results = []
		if (parameters.folderPath === '/') {
			// Return all the labels the user or Gmail has created
			const labelsResult = await instance.get('/gmail/v1/users/me/labels')

			// If there is a result, parse it
			if (labelsResult.data && labelsResult.data.labels) {
				// Loop through the labels
				for (const label of labelsResult.data.labels) {
					// Add the label to the results
					results.push({
						name: `${label.name}`,
						path: `/${label.name}`,
						kind: 'folder', // Labels are folders, threads are files within them
						provider: 'gmail',
						mimeType: 'mail/label', // Weird mime type invented by me TODO: replace this with a proper one
						size: Number.NaN, // We could return number of threads or number of messages with that label, but it will require another request per label
						createdAtTime: Number.NaN, // No such thing as when the label was created
						lastModifiedTime: Number.NaN, // Or when it was last modified
						contentURI: `https://mail.google.com/mail/u/0/#search/label%3A${(
							label.name || ''
						).replace(/ /g, '%2F')}` // Content URI
					})
				}

				// Also manually add a special label ALL_MAIL
				results.push({
					name: `ALL_MAIL`,
					path: `/ALL_MAIL`,
					kind: 'folder', // Labels are folders, threads are files within them
					provider: 'gmail',
					mimeType: 'mail/label', // Weird mime type invented by me TODO: replace this with a proper one
					size: Number.NaN, // We could return number of threads or number of messages with that label, but it will require another request per label
					createdAtTime: Number.NaN, // No such thing as when the label was created
					lastModifiedTime: Number.NaN, // Or when it was last modified
					contentURI: `https://mail.google.com/mail/u/0/#all` // Content URI
				})
			}

			// Sort the results using the sortFile function
			results = sortFiles(
				compareWith,
				operator,
				value,
				orderBy,
				direction,
				results
			)

			return { content: results, nextSetToken: null }
		}

		// Folders are treated as labels
		const labelIdQ =
			parameters.folderPath.includes('/ALL_MAIL')
				? '?q='
				: `?labelIds=${await getLabelsFromName(
						instance,
						parameters.folderPath
				  ).join('&labelIds=')}`

		// List out all the threads labelled with that particular label
		let allThreads = []
		let nextPageToken = queries.nextSetToken
		do {
			// Run the GET request
			// eslint-disable-next-line no-await-in-loop
			const listResult = await instance.get(
				`/gmail/v1/users/me/threads/${labelIdQ}&maxResults=25${
					nextPageToken ? `&pageToken=${nextPageToken}` : ''
				}`
			)

			// Get the next page token (incase Gmail returned incomplete results)
			nextPageToken = listResult.data.nextPageToken

			// Add the files we got right now to the main list
			if (listResult.data.threads) {
				allThreads = [...allThreads, ...listResult.data.threads]
			}
		} while (nextPageToken && allThreads.length < (parameters.limit || 50))
		// Keep doing the above list request until there is no nextPageToken
		// returned or the max result limit is reached

		// Loop through the threads
		if (allThreads.length > 0) {
			for (const thread of allThreads) {
				// If the export type is view, get only the metadata, else get everything
				// eslint-disable-next-line no-await-in-loop
				const threadResult = await instance.get(
					`/gmail/v1/users/me/threads/${thread.id}`,
					{
						params: {
							format: 'METADATA'
						}
					}
				)

				// If the thread exists, parse it
				if (threadResult.data && threadResult.data.messages) {
					// Get all its messages
					const { messages } = threadResult.data
					if (messages.length > 0) {
						// Get the first and last messages
						const firstMessage = messages[0]
						const lastMessage = messages[messages.length - 1]
						// Get the headers of the messages
						const firstHeaders = firstMessage.payload.headers
						const lastHeaders = lastMessage.payload.headers

						// Get the subject from the last email, as that is what is seen in
						// the user's inbox
						let subject = '(No Subject)'
						const subjectHeaders = lastHeaders.filter(
							(header) => header.name.toLowerCase() === 'subject'
						)
						if (subjectHeaders.length > 0) {
							subject = subjectHeaders[0].value
						}

						// The created at time is when the first message was sent
						let createdAtDate
						const createdAtDateHeaders = firstHeaders.filter(
							(header) => header.name.toLowerCase() === 'date'
						)
						if (createdAtDateHeaders.length > 0) {
							createdAtDate = createdAtDateHeaders[0].value
						}

						// The last modified time is when the last message was sent
						// Note: would be more accurate to use internalDate, but that
						// is only returned when retrieving a specific message
						let lastModifiedDate
						const lastModifiedDateHeaders = lastHeaders.filter(
							(header) => header.name.toLowerCase() === 'date'
						)
						if (lastModifiedDateHeaders.length > 0) {
							lastModifiedDate = lastModifiedDateHeaders[0].value
						}

						// The content URI
						const contentURI = `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}` // View in gmail

						// Add this to the results
						results.push({
							name: `${formatDate(lastModifiedDate)} - ${
								threadResult.data.id
							} - ${subject || '(No subject)'}.zip`,
							path: diskPath(
								parameters.folderPath,
								`${formatDate(lastModifiedDate)} - ${threadResult.data.id} - ${
									subject || '(No subject)'
								}.zip`
							),
							kind: 'file', // An entire thread can be viewed at once. Labels are folders, not threads
							provider: 'gmail',
							mimeType: 'mail/thread', // Weird mime type invented by me TODO: replace this with a proper one
							size: Number.NaN, // We have size of messages+attachments, not threads
							createdAtTime: createdAtDate
								? new Date(createdAtDate).toISOString()
								: Number.NaN, // When the first message was sent
							lastModifiedTime: lastModifiedDate
								? new Date(lastModifiedDate).toISOString()
								: Number.NaN, // When the last message was sent
							contentURI // Content URI
						})
					}
				}
			}

			// Sort the results using the sortFile function
			results = sortFiles(
				compareWith,
				operator,
				value,
				orderBy,
				direction,
				results
			)

			return { content: results, nextSetToken: nextPageToken }
		}

		return []
	}

	async read(body, headers, parameters, queries) {
		// Get the access token from the header
		const accessToken = headers.Authorization || headers.authorization
		// If there is no access token, return a 401 Unauthorised error
		if (!accessToken) {
			throw new UnauthorizedError('No access token specified')
		}

		// Create an axios instance with the header. All requests will be made with this
		// instance so the headers will be present everywhere
		const instance = axios.create({
			baseURL: 'https://gmail.googleapis.com/',
			headers: { Authorization: accessToken }
		})

		// File name is the thread ID
		const threadId = getThreadIDFromName(parameters.fileName)

		// Get the export type
		const { exportType } = queries

		// Get that particular thread from the Gmail API
		const threadResult = await instance.get(
			`/gmail/v1/users/me/threads/${threadId}`,
			{
				params: {
					format: exportType === 'view' ? 'METADATA' : 'FULL'
				}
			}
		)

		// If the thread exists, parse it
		if (threadResult.data && threadResult.data.messages) {
			// Get all its messages
			const { messages } = threadResult.data
			if (messages.length > 0) {
				// Get the first and last messages
				const firstMessage = messages[0]
				const lastMessage = messages[messages.length - 1]
				// Get the headers for the messages
				const firstHeaders = firstMessage.payload.headers
				const lastHeaders = lastMessage.payload.headers

				// Get the subject from the last email, as that is what is seen in
				// the user's inbox
				let subject = '(No Subject)'
				const subjectHeaders = lastHeaders.filter(
					(header) => header.name.toLowerCase() === 'subject'
				)
				if (subjectHeaders.length > 0) {
					subject = (subjectHeaders[0] || {}).value
				}

				// The created at time is when the first message was sent
				let createdAtDate
				const createdAtDateHeaders = firstHeaders.filter(
					(header) => header.name.toLowerCase() === 'date'
				)
				if (createdAtDateHeaders.length > 0) {
					createdAtDate = (createdAtDateHeaders[0] || {}).value
				}

				// The last modified time is when the last message was sent
				// Note: would be more accurate to use internalDate, but that
				// is only returned when retrieving a specific message
				let lastModifiedDate
				const lastModifiedDateHeaders = lastHeaders.filter(
					(header) => header.name.toLowerCase() === 'date'
				)
				if (lastModifiedDateHeaders.length > 0) {
					lastModifiedDate = (lastModifiedDateHeaders[0] || {}).value
				}

				// The content URI
				const contentURI =
					exportType === 'view'
						? `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}`
						: await createMailDataURI(instance, threadResult.data)

				// Add this to the results
				return {
					name: `${formatDate(lastModifiedDate)} - ${threadId} - ${
						subject || '(No subject)'
					}.zip`,
					path: diskPath(
						parameters.folderPath,
						`${formatDate(lastModifiedDate)} - ${threadResult.data.id} - ${
							subject || '(No subject)'
						}.zip`
					),
					kind: 'file', // An entire thread can be viewed at once. Labels are folders, not threads
					provider: 'gmail',
					mimeType: 'mail/thread', // Weird mime type invented by me TODO: replace this with a proper one
					size: Number.NaN, // We have size of messages+attachments, not threads
					createdAtTime: createdAtDate
						? new Date(createdAtDate).toISOString()
						: Number.NaN, // When the first message was sent
					lastModifiedTime: lastModifiedDate
						? new Date(lastModifiedDate).toISOString()
						: Number.NaN, // When the last message was sent
					contentURI // Content URI
				}
			}
		} else {
			throw new NotFoundError(`Coudn't find thread with ID ${threadId}`)
		}
	}

	// NOTE: Ideally, the create() method would create a new thread, while the
	// update() method would reply to a thread. This would have been possible
	// except for the fact that an email must be sent to another person
	// (person's email address). The addition of this field, as well as
	// (possibly) a "reply to email address" would make it difficult to fit it
	// within the file and folder paradigm we currently have, as it does
	// not take into account multiple people (another thing that is hit by
	// this shortcoming is shared files - though you might be able to view
	// them, you can't create shared files or share existing ones). If and
	// when the API supports people as another type of object along with files
	// and folders, this feature (creating and replying to threads) stands
	// as one of the first to be added.

	// Trash a thread
	async delete(body, headers, parameters, queries) {
		// Get the access token from the header
		const accessToken = headers.Authorization || headers.authorization
		// If there is no access token, return a 401 Unauthorised error
		if (!accessToken) {
			throw new UnauthorizedError('No access token specified')
		}

		// Create an axios instance with the header. All requests will be made with this
		// instance so the headers will be present everywhere
		const instance = axios.create({
			baseURL: 'https://gmail.googleapis.com/',
			headers: { Authorization: accessToken }
		})

		// File name is the thread ID, we don't care about the folder
		const threadId = getThreadIDFromName(parameters.fileName)

		// Check if there is a thread ID (in delete, file name is optional,
		// but in Gmail, we can't delete a label)
		if (!threadId) {
			throw new MissingParamError('Missing thread ID')
		}

		// Trash the thread, don't delete it permanently
		return instance.post(`/gmail/v1/users/me/threads/${threadId}/trash`)
	}
}

// MARK: Export

// Export the Provider class as the default export
exports.default = GmailProvider
