// Use the axios library to make network requests
import axios, { AxiosInstance } from 'axios'
// Use the filesystem library to read uploaded file contents
import * as Fs from 'fs-extra'
// Use the archiver library to zip the generated markdown files
import Archiver from 'archiver'
// Use breakdance to convert html to markdown
import breakdance from 'breakdance'
// Use the env paths library to get the local cache path
import EnvPaths from 'env-paths'
const cachePath = EnvPaths('Dabbu Files API Server', {
	suffix: '',
}).cache

// Implement the DataProvider interface
import DataProvider from '../provider'

// Import errors and utility functions
import {
	InvalidProviderCredentialsError,
	MissingParameterError,
	NotFoundError,
	NotImplementedError,
	ProviderInteractionError,
} from '../utils/errors.util'
import * as Utils from '../utils/general.util'
import * as Guards from '../utils/guards.util'
// Import the logger
import Logger from '../utils/logger.util'

// Convert the Utils.JSON object returned by the Gmail API to a Dabbu DabbuResource
async function convertGmailFileToDabbuResource(
	httpClient: AxiosInstance,
	clientId: string,
	threadResult: Record<string, any>,
	folderPath: string,
	exportType: string | undefined,
): Promise<DabbuResource> {
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
			(header: { name: string; value: string }) =>
				header.name.toLowerCase() === 'subject',
		)
		if (subjectHeaders.length > 0) {
			subject = subjectHeaders[0].value
		}

		// The created at time is when the first message was sent
		const createdAtDateHeaders = firstHeaders.filter(
			(header: { name: string; value: string }) =>
				header.name.toLowerCase() === 'date',
		)
		const createdAtDate =
			createdAtDateHeaders.length > 0
				? createdAtDateHeaders[0].value
				: undefined

		// The last modified time is when the last message was sent
		// Note: would be more accurate to use internalDate, but that
		// is only returned when retrieving a specific message
		const lastModifiedDateHeaders = lastHeaders.filter(
			(header: { name: string; value: string }) =>
				header.name.toLowerCase() === 'date',
		)
		const lastModifiedDate =
			lastModifiedDateHeaders.length > 0
				? lastModifiedDateHeaders[0].value
				: undefined

		// The content URI to view the thread in Gmail
		const contentUri =
			exportType === 'view'
				? `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}`
				: await createMailDataURI(
						httpClient,
						clientId,
						threadResult.data,
				  )

		// Add this to the results
		return {
			name: `${formatDate(lastModifiedDate)} - ${
				threadResult.data.id
			} - ${subject || '(No subject)'}.zip`.replace(/\//g, '|'),
			path: Utils.diskPath(
				folderPath,
				`${formatDate(lastModifiedDate)} - ${threadResult.data.id} - ${
					subject || '(No subject)'
				}.zip`.replace(/\//g, '|'),
			),
			// An entire thread can be viewed at once. Labels are folders, not threads
			kind: 'file',
			provider: 'gmail',
			// Weird mime type invented by me
			// TODO: replace this with a proper one
			mimeType: 'mail/thread',
			// We have size of messages+attachments, not threads
			size: Number.NaN,
			// When the first message was sent
			createdAtTime: createdAtDate
				? new Date(createdAtDate).toISOString()
				: '',
			// When the last message was sent
			lastModifiedTime: lastModifiedDate
				? new Date(lastModifiedDate).toISOString()
				: '',
			// Content URI
			contentUri: contentUri,
		}
	} else {
		// No messages in the thread. I guess this ideally should not happen
		return {
			name: `${Number.NaN} - ${threadResult.data.id} - (No subject).zip`.replace(
				/\//g,
				'|',
			),
			path: Utils.diskPath(
				folderPath,
				`${Number.NaN} - ${threadResult.data.id} - (No subject).zip`.replace(
					/\//g,
					'|',
				),
			),
			// An entire thread can be viewed at once. Labels are folders, not threads
			kind: 'file',
			provider: 'gmail',
			// Weird mime type invented by me
			// TODO: replace this with a proper one
			mimeType: 'mail/thread',
			// We have size of messages+attachments, not threads
			size: Number.NaN,
			// When the first message was sent
			createdAtTime: '',
			// When the last message was sent
			lastModifiedTime: '',
			// Content URI
			contentUri: `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}`,
		}
	}
}

// Get the thread ID from a file name (the file names are in
// the format `{date} - {threadID} - {subject}`)
function getThreadIDFromName(
	name: string | undefined,
): string | undefined {
	if (!name) return undefined

	const splitName = name.split('-')
	if (splitName.length === 1) {
		return name
	}

	if (splitName.length >= 2) {
		return splitName[1].trim()
	}
}

// Get a label from a folder path
async function getLabelsFromName(
	httpClient: AxiosInstance,
	name: string,
): Promise<Array<string> | undefined> {
	if (!name || name.toLowerCase() === '/') {
		return undefined
	}

	// Each folder name is a label. Multiple folder names are interpreted
	// as an AND query
	const labelNames = name.split('/')
	const labelIds = []

	let labelsResult
	try {
		// eslint-disable-next-line prefer-const
		labelsResult = await httpClient.get('/gmail/v1/users/me/labels')
	} catch (error) {
		Logger.error(
			`provider.gmail.getLabelsFromName: error occcurred while retrieving user's labels: ${Utils.json(
				error,
			)}`,
		)
		throw new NotFoundError("Error retrieving user's labels")
	}

	for (let i = 0, { length } = labelNames; i < length; i++) {
		const labelName = labelNames[i]
		// If there is a result, parse it
		if (labelsResult && labelsResult.data && labelsResult.data.labels) {
			// Loop through the labels
			for (const label of labelsResult.data.labels) {
				if (label.name === labelName) {
					labelIds.push(label.id)
				}
			}
		}
	}

	if (labelIds.length < 0) {
		throw new NotFoundError(`Invalid label(s): ${name}`)
	}

	return labelIds
}

// Format a date to YYYYMMDD
function formatDate(unformattedDate: string | Date) {
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
function indexHeaders(headers: Array<Record<string, any>>) {
	if (!headers) {
		return {}
	}

	const result: Record<string, any> = {}
	for (const header of headers) {
		result[header.name.toLowerCase()] = header.value
	}

	return result
}

// Parse a Gmail message and return a nice object
function parseGmailMessage(message: Record<string, any>) {
	// Get the message ID, thread ID, label IDs (though only thread ID is needed)
	const result: Record<string, any> = {
		id: message.id,
		threadId: message.threadId,
		labelIds: message.labelIds,
	}

	// The message payload (contains body and attachments)
	const { payload } = message
	if (!payload) {
		return result
	}

	// The headers, contains the subject, date, from and to emails
	let headers = indexHeaders(payload.headers)

	// Parse the subject, date, from and to emails from the headers
	result.subject =
		headers.subject === '' ? '(No subject)' : headers.subject
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
		const isPlain =
			part.mimeType && part.mimeType.includes('text/plain')
		// Does the part point to an attachment
		const isAttachment = Boolean(
			part.body.attachmentId ||
				(headers['content-disposition'] &&
					headers['content-disposition']
						.toLowerCase()
						.includes('attachment')),
		)
		// Is the part an inline attachment
		const isInline =
			headers['content-disposition'] &&
			headers['content-disposition'].toLowerCase().includes('inline')

		if (isHtml && !isAttachment) {
			// Convert the html to markdown and add it to the result
			result.text = breakdance(
				Buffer.from(part.body.data, 'base64').toString(),
			)
				// Replace br tags with a newline and u tags with underline, as
				// breakdance doesn't do that
				.replace(/<br>/g, '\n')
				.replace(/<\/br>/g, '\n')
				.replace(/<\/u>/g, '_')
				.replace(/<\/u>/g, '_')
		} else if (isPlain && !isAttachment) {
			// Add the plain text to the result
			result.text = Buffer.from(part.body.data, 'base64').toString(
				'ascii',
			)
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
				headers: indexHeaders(part.headers),
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
				headers: indexHeaders(part.headers),
			})
		}

		firstPartProcessed = true
	}

	// Return succesfully
	return result
}

// Our special function to get all the messages in a thread, and their
// attachments, and send back a download URL
async function createMailDataURI(
	httpClient: AxiosInstance,
	clientId: string,
	threadData: Record<string, any>,
): Promise<string> {
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
		} - ${message.subject}`.replace(/\//g, '|')
		archiveName = messageFileName

		// Create the directories which contain the generated and zip files
		// eslint-disable-next-line no-await-in-loop
		await Fs.ensureDir(`${cachePath}/_gmail/generated/${clientId}/`)

		// Show the attachments and inline stuff in a nice way at the
		// end of the file
		let attachmentsText = ''
		let inlineText = ''
		if (message.attachments) {
			for (
				let j = 0, { length } = message.attachments;
				j < length;
				j++
			) {
				const attachment = message.attachments[j]
				// First add the text to the message file
				attachmentsText += [
					`${attachment.filename}:`,
					` - mimeType: ${attachment.mimeType}`,
					` - size: ${attachment.size}\n`,
				].join('\n')
				// Then fetch the attachment
				// Surround in try-catch block as we don't want one failed result to
				// kill the entire operation
				try {
					// Get the attachment as a base64 encoded string
					// eslint-disable-next-line no-await-in-loop
					const attachmentResult = await httpClient.get(
						`/gmail/v1/users/me/messages/${message.id}/attachments/${attachment.attachmentId}`,
					)
					if (attachmentResult.data && attachmentResult.data.data) {
						// Write the attachment data to a file
						// eslint-disable-next-line no-await-in-loop
						await Fs.writeFile(
							`${cachePath}/_gmail/generated/${clientId}/${messageFileName} - ${attachment.filename.replace(
								/\//g,
								'|',
							)}`,
							Buffer.from(attachmentResult.data.data, 'base64'),
						)
						// Add the file path and name to the array
						attachmentPaths.push({
							name: `${messageFileName} - ${attachment.filename.replace(
								/\//g,
								'|',
							)}`,
							path: `${cachePath}/_gmail/generated/${clientId}/${messageFileName} - ${attachment.filename.replace(
								/\//g,
								'|',
							)}`,
						})
					} else {
						// No data
						attachmentsText += 'Failed to fetch attachment'
					}
				} catch (error) {
					Logger.error(
						`provider.gmail.createMailDataUri: error occcurred while retrieving attachment: ${Utils.json(
							error,
						)}`,
					)
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
					` - size: ${attachment.size}\n`,
				].join('\n')
				// Then fetch the attachment
				// Surround in try-catch block as we don't want one failed result to
				// kill the entire operation
				try {
					// Get the attachment as a base64 encoded string
					// eslint-disable-next-line no-await-in-loop
					const attachmentResult = await httpClient.get(
						`/gmail/v1/users/me/messages/${message.id}/attachments/${attachment.attachmentId}`,
					)
					if (attachmentResult.data && attachmentResult.data.data) {
						// Write the attachment data to a file
						// eslint-disable-next-line no-await-in-loop
						await Fs.writeFile(
							`${cachePath}/_gmail/generated/${clientId}/${messageFileName} - ${
								i + 1
							} - ${attachment.filename.replace(/\//g, '|')}`,
							Buffer.from(attachmentResult.data.data, 'base64'),
						)
						// Add the file path and name to the array
						attachmentPaths.push({
							name: `${messageFileName} - ${
								i + 1
							} - ${attachment.filename.replace(/\//g, '|')}`,
							path: `${cachePath}/_gmail/generated/${clientId}/${messageFileName} - ${
								i + 1
							} - ${attachment.filename.replace(/\//g, '|')}`,
						})
					} else {
						// No data
						attachmentsText += 'Failed to fetch attachment'
					}
				} catch (error) {
					Logger.error(
						`provider.gmail.createMailDataUri: error occcurred while retrieving attachment: ${Utils.json(
							error,
						)}`,
					)
					// Some error occurred, tell the user
					attachmentsText += `Failed to fetch attachment: ${error.message}\n`
				}
			}
		} else {
			inlineText = 'No inline attachments found'
		}

		// Write the data to the file
		// eslint-disable-next-line no-await-in-loop
		await Fs.writeFile(
			`${cachePath}/_gmail/generated/${clientId}/${messageFileName} - ${
				i + 1
			}.md`,
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
				`${inlineText}`,
			].join('\n'),
		)

		messagePaths.push({
			name: `${messageFileName} - ${i + 1}.md`,
			path: `${cachePath}/_gmail/generated/${clientId}/${messageFileName} - ${
				i + 1
			}.md`,
		})
	}

	// Pack it all in a zip file
	await Fs.createFile(
		`${cachePath}/_cache/${clientId}/${archiveName}.zip`,
	)
	const output = Fs.createWriteStream(
		`${cachePath}/_cache/${clientId}/${archiveName}.zip`,
	)
	const archive = Archiver('zip', {
		zlib: { level: 9 }, // Sets the compression level.
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
		// Catch errors
		archive.on('error', (error) => {
			reject(error)
		})
		output.on('error', (error) => {
			reject(error)
		})

		// Finalize the contents
		archive.finalize()

		// Pipe archive data to the file
		archive.pipe(output)

		// Once the file is written, return
		output.on('close', () => {
			resolve(
				`http://localhost:${process.env
					.DABBU_FILES_API_SERVER_PORT!}/files-api/v3/internal/cache/${encodeURIComponent(
					`${archiveName}.zip`,
				)}`,
			)
		})
	})
}

export default class GmailDataProvider implements DataProvider {
	// List files and folders at a particular folder path
	async list(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the X-Provider-Credentials header
		Guards.checkProviderCredentials(headers)

		// If an access token is present, create an axios httpClient with the access
		// token in the X-Provider-Credentials header
		const httpClient = axios.create({
			baseURL: 'https://www.googleapis.com/',
			headers: {
				Authorization:
					headers['X-Provider-Credentials'] ||
					headers['x-provider-credentials'],
			},
		})

		// Start parsing the folder path and the options
		// If the request is for / (the root folder), then return a list
		// of all labels. Else return the list of threads with that label
		let results: Array<DabbuResource> = []
		if (parameters.folderPath === '/') {
			// Return all the labels the user or Gmail has created
			let labelsResult
			try {
				// eslint-disable-next-line prefer-const
				labelsResult = await httpClient.get('/gmail/v1/users/me/labels')
			} catch (error) {
				Logger.error(
					`provider.gmail.list: error occcurred while retrieving user's labels: ${Utils.json(
						error,
					)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else {
					// Return a proper error message
					const errorMessage =
						error.response.data &&
						error.response.data.error &&
						error.response.data.error.message
							? error.response.data.error.message
							: 'Unknown error'
					throw new ProviderInteractionError(
						`Error fetching labels: ${errorMessage}`,
					)
				}
			}

			// If there is a result, parse it
			if (labelsResult.data && labelsResult.data.labels) {
				// Loop through the labels
				for (const label of labelsResult.data.labels) {
					// Add the label to the results
					results.push({
						name: `${label.name}`,
						path: `/${label.name}`,
						// Labels are folders, threads are files within them
						kind: 'folder',
						provider: 'gmail',
						// Weird mime type invented by me
						// TODO: replace this with a proper one
						mimeType: 'mail/label',
						// We could return number of threads or number of messages with
						// that label, but it will require another request per label
						size: Number.NaN,
						// No such thing as when the label was created
						createdAtTime: '',
						// Or when it was last modified
						lastModifiedTime: '',
						// Content URI
						contentUri: `https://mail.google.com/mail/u/0/#search/label%3A${(
							label.name || ''
						).replace(/ /g, '%2F')}`,
					})
				}

				// Also manually add a special label ALL_MAIL
				results.push({
					name: `ALL_MAIL`,
					path: `/ALL_MAIL`,
					// Labels are folders, threads are files within them
					kind: 'folder',
					provider: 'gmail',
					// Weird mime type invented by me
					// TODO: replace this with a proper one
					mimeType: 'mail/label',
					// We could return number of threads or number of messages with that
					// label, but it will require another request per label
					size: Number.NaN,
					// No such thing as when the label was created
					createdAtTime: '',
					// Or when it was last modified
					lastModifiedTime: '',
					// Content URI
					contentUri: `https://mail.google.com/mail/u/0/#all`,
				})
			}

			// Sort the results using the sortFile function
			results = Utils.sortDabbuResources(
				results,
				queries as DabbuListRequestOptions,
			)

			return { code: 200, content: results, nextSetToken: undefined }
		}

		// Folders are treated as labels
		const labelIds = await getLabelsFromName(
			httpClient,
			parameters.folderPath,
		)
		const labelIdQ =
			parameters.folderPath.includes('/ALL_MAIL') || !labelIds
				? '?q='
				: `?labelIds=${labelIds.join('&labelIds=')}`

		// List out all the threads labelled with that particular label
		let allThreads: Array<Record<string, any>> = []
		let nextPageToken = queries.nextSetToken
		do {
			// Run the GET request
			let listResult
			try {
				// eslint-disable-next-line no-await-in-loop
				// eslint-disable-next-line prefer-const
				listResult = await httpClient.get(
					`/gmail/v1/users/me/threads/${labelIdQ}&maxResults=50${
						nextPageToken ? `&pageToken=${nextPageToken}` : ''
					}`,
				)
			} catch (error) {
				Logger.error(
					`provider.gmail.list: error occcurred while retrieving user's threads: labelIdQ = ${labelIdQ}; nextPageToken = ${nextPageToken}; error: ${Utils.json(
						error,
					)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else if (error.response.status == 400) {
					// If it is a 400, throw a not found for the labels
					throw new NotFoundError(
						`Invalid labels ${
							parameters.folderPath
								? parameters.folderPath.split('/').join(',')
								: ''
						}`,
					)
				} else {
					// Return a proper error message
					const errorMessage =
						error.response.data &&
						error.response.data.error &&
						error.response.data.error.message
							? error.response.data.error.message
							: 'Unknown error'
					throw new ProviderInteractionError(
						`Error fetching threads: ${errorMessage}`,
					)
				}
			}

			// Get the next page token (incase Gmail returned incomplete results)
			nextPageToken = listResult.data.nextPageToken

			// Add the files we got right now to the main list
			if (listResult.data.threads) {
				allThreads = [...allThreads, ...listResult.data.threads]
			}
		} while (
			nextPageToken &&
			allThreads.length < (parameters.limit || 50)
		)
		// Keep doing the above list request until there is no nextPageToken
		// returned or the max result limit is reached

		// Loop through the threads
		if (allThreads.length > 0) {
			for (const thread of allThreads) {
				// If the export type is view, get only the metadata, else get
				// everything
				let threadResult
				try {
					// eslint-disable-next-line no-await-in-loop
					// eslint-disable-next-line prefer-const
					threadResult = await httpClient.get(
						`/gmail/v1/users/me/threads/${thread.id}`,
						{
							params: {
								format:
									queries.exportType === 'media' ? 'FULL' : 'METADATA',
							},
						},
					)
				} catch (error) {
					Logger.error(
						`provider.gmail.list: error occcurred while retrieving user's threads: thread ID: ${
							thread.id
						}; error: ${Utils.json(error)}`,
					)
					if (error.response.status === 401) {
						// If it is a 401, throw an invalid credentials error
						throw new InvalidProviderCredentialsError(
							'Invalid access token',
						)
					} else {
						// Return a proper error message
						const errorMessage =
							error.response.data &&
							error.response.data.error &&
							error.response.data.error.message
								? error.response.data.error.message
								: 'Unknown error'
						throw new ProviderInteractionError(
							`Error fetching messages for thread ${thread.id}: ${errorMessage}`,
						)
					}
				}

				// If the thread exists, parse it
				if (threadResult.data && threadResult.data.messages) {
					// Add it to the results
					results.push(
						await convertGmailFileToDabbuResource(
							httpClient,
							creds.id,
							threadResult,
							parameters.folderPath,
							queries.exportType,
						),
					)
				}
			}

			// Sort the results using the sortFile function
			results = Utils.sortDabbuResources(
				results,
				queries as DabbuListRequestOptions,
			)

			// Return the files
			return {
				code: 200,
				content: results,
				nextSetToken: nextPageToken,
			}
		}

		// Empty label
		return {
			code: 200,
			content: [],
		}
	}

	// Return information about the file at the specified location
	async read(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the X-Provider-Credentials header
		Guards.checkProviderCredentials(headers)

		// If an access token is present, create an axios httpClient with the access
		// token in the X-Provider-Credentials header
		const httpClient = axios.create({
			baseURL: 'https://www.googleapis.com/',
			headers: {
				Authorization:
					headers['X-Provider-Credentials'] ||
					headers['x-provider-credentials'],
			},
		})

		// Start parsing the file path and the options
		// File name is the thread ID
		const threadId = getThreadIDFromName(parameters.fileName)

		// Get that particular thread from the Gmail API
		let threadResult
		try {
			// eslint-disable-next-line prefer-const
			threadResult = await httpClient.get(
				`/gmail/v1/users/me/threads/${threadId}`,
				{
					params: {
						format:
							queries.exportType === 'media' ? 'FULL' : 'METADATA',
					},
				},
			)
		} catch (error) {
			Logger.error(
				`provider.gmail.read: error occcurred while retrieving thread ${threadId}: ${Utils.json(
					error,
				)}`,
			)
			if (error.response.status === 401) {
				// If it is a 401, throw an invalid credentials error
				throw new InvalidProviderCredentialsError(
					'Invalid access token',
				)
			} else if (error.response.status === 400) {
				// If it is a 400 (invalid thread ID), throw a not found error
				throw new NotFoundError(`The thread ${threadId} does not exist`)
			} else {
				// Return a proper error message
				const errorMessage =
					error.response.data &&
					error.response.data.error &&
					error.response.data.error.message
						? error.response.data.error.message
						: 'Unknown error'
				throw new ProviderInteractionError(
					`Error fetching thread ${threadId}: ${errorMessage}`,
				)
			}
		}

		// If the thread exists, parse it
		if (threadResult.data && threadResult.data.messages) {
			// Parse it and return the result
			return {
				code: 200,
				content: await convertGmailFileToDabbuResource(
					httpClient,
					creds.id,
					threadResult,
					parameters.folderPath,
					queries.exportType,
				),
			}
		} else {
			throw new ProviderInteractionError(
				'Invalid response from Gmail API (empty thread)',
			)
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

	// Upload a file to the specified location
	async create(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
		fileMetadata: MulterFile,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the X-Provider-Credentials header.
		// Even though this method is not implemented, only authorized users should
		// know that
		Guards.checkProviderCredentials(headers)

		// Start parsing the file path and the option
		// Else throw an error
		throw new NotImplementedError(
			'The Gmail provider does not yet support sending emails (create/POST request)',
		)
	}

	// Update the file at the specified location
	async update(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
		fileMetadata: MulterFile,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the X-Provider-Credentials header.
		// Even though this method is not implemented, only authorized users should
		// know that
		Guards.checkProviderCredentials(headers)

		// Start parsing the file path and the option
		// Else throw an error
		throw new NotImplementedError(
			'The Gmail provider does not yet support replying to emails (update/PUT request)',
		)
	}

	// Delete the file/folder at the specified location
	async delete(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the X-Provider-Credentials header
		Guards.checkProviderCredentials(headers)

		// If an access token is present, create an axios httpClient with the access
		// token in the X-Provider-Credentials header
		const httpClient = axios.create({
			baseURL: 'https://www.googleapis.com/',
			headers: {
				Authorization:
					headers['X-Provider-Credentials'] ||
					headers['x-provider-credentials'],
			},
		})

		// Start parsing the file path and the options
		// File name is the thread ID, we don't care about the folder
		const threadId = getThreadIDFromName(parameters.fileName)

		// Check if there is a thread ID (in delete, file name is optional,
		// but in Gmail, we can't delete a label)
		if (!threadId) {
			throw new MissingParameterError('Missing thread ID')
		}

		// Trash the thread, don't delete it permanently
		try {
			await httpClient.post(
				`/gmail/v1/users/me/threads/${threadId}/trash`,
			)
		} catch (error) {
			Logger.error(
				`provider.gmail.delete: error occcurred while trashing thread ${threadId}: ${Utils.json(
					error,
				)}`,
			)
			if (error.response.status === 401) {
				// If it is a 401, throw an invalid credentials error
				throw new InvalidProviderCredentialsError(
					'Invalid access token',
				)
			} else if (error.response.status === 404) {
				// If it is a 404, throw a not found error
				throw new NotFoundError(`The thread ${threadId} does not exist`)
			} else {
				// Return a proper error message
				const errorMessage =
					error.response.data &&
					error.response.data.error &&
					error.response.data.error.message
						? error.response.data.error.message
						: 'Unknown error'
				throw new ProviderInteractionError(
					`Error deleting thread ${threadId}: ${errorMessage}`,
				)
			}
		}

		return {
			code: 204,
		}
	}
}
