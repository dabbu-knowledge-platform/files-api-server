// Use the axios library to make network requests
import axios from 'axios'
// Use the file type library to determine the mime type of a file
import FileType from 'file-type'
// Use the filesystem library to read uploaded file contents
import * as Fs from 'fs-extra'

// Implement the DataProvider interface
import DataProvider from '../provider'

// Import errors and utility functions
import {
	BadRequestError,
	InvalidCredentialsError,
	MissingParameterError,
	NotFoundError,
	ProviderInteractionError,
} from '../utils/errors.util'
import * as Utils from '../utils/general.util'
import * as Guards from '../utils/guards.util'

// Convert the JSON object returned by the One Drive API to a Dabbu Resource
function convertOneDriveFileToDabbuResource(
	fileObject: Record<string, any>,
	folderPath: string,
	isShared: boolean,
	exportType: string | undefined,
): DabbuResource {
	// Name of the file
	const { name } = fileObject
	// File or folder
	const kind = fileObject.folder ? 'folder' : 'file'
	const path = isShared
		? Utils.diskPath('/Shared', folderPath, name)
		: // Absolute path to the file
		  Utils.diskPath(folderPath, name)
	// Mime type
	const mimeType =
		kind === 'folder'
			? 'application/vnd.onedrive.folder'
			: fileObject.file
			? fileObject.file.mimeType
			: fileObject.package
			? fileObject.package.type
			: 'unknown'
	// Size in bytes, let clients convert to whatever unit they want
	const { size } = fileObject
	// When it was created
	const createdAtTime = new Date(
		fileObject.fileSystemInfo.createdDateTime,
	).toISOString()
	// Last time the file or its metadata was changed
	const lastModifiedTime = new Date(
		fileObject.fileSystemInfo.lastModifiedDateTime,
	).toISOString()
	let contentUri = ''
	// If the export type is media, then return a googleapis.com link
	if (exportType === 'view') {
		// If the export type is view, return an "Open in One Drive Editor" link
		contentUri = fileObject.webUrl
	} else {
		// Else return a link that streams the file's contents
		contentUri =
			// Without access token, but short-lived
			fileObject['@microsoft.graph.downloadUrl'] ||
			// With access token, does not work always
			`https://graph.microsoft.com/v1.0/${
				isShared
					? `/me/drive/sharedWithMe:${path}:/content`
					: `/me/drive/root:${path}:/content`
			}`
	}

	return {
		name,
		kind,
		provider: 'onedrive',
		path,
		mimeType,
		size,
		createdAtTime,
		lastModifiedTime,
		contentUri,
	}
}

export default class OneDriveDataProvider implements DataProvider {
	// List files and folders at a particular folder path
	async list(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the Authorization header
		Guards.checkAccessToken(headers)

		// If an access token is present, create an axios httpClient with the access
		// token in the Authorization header
		const httpClient = axios.create({
			baseURL: 'https://graph.microsoft.com/v1.0/',
			headers: {
				Authorization:
					headers['Authorization'] || headers['authorization'],
			},
		})

		// Start parsing the folder path and the options
		// Is the file shared (explicitly or implicitly)
		const isShared =
			Utils.diskPath(parameters.folderPath).startsWith('/Shared') ||
			Utils.diskPath(parameters.folderPath).startsWith('Shared')
		// Get the folder path from the URL and replace the /Shared part if it is in the beginning
		const folderPath = Utils.diskPath(
			isShared
				? parameters.folderPath.replace('Shared', '')
				: parameters.folderPath,
		)

		// Don't allow relative paths, let clients do that
		Guards.checkRelativePath(parameters.folderPath)

		// Query the one drive API for the docs
		// Create the query
		const listQuery = isShared
			? `/me/drive/sharedWithMe${
					folderPath && folderPath !== '/' ? `:${folderPath}:` : ''
			  }`
			: `/me/drive/root${
					folderPath && folderPath !== '/' ? `:${folderPath}:` : ''
			  }/children?top=25`

		let allFiles: Array<Record<string, any>> = []
		let nextPageLink = queries.nextSetToken || listQuery
		do {
			// List all files that match the given query
			let listResult
			try {
				// eslint-disable-next-line no-await-in-loop
				listResult = await httpClient.get(nextPageLink)
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else if (error.response.status === 404) {
					// If it is a 404, throw a not found error
					throw new NotFoundError(
						`The folder ${folderPath} does not exist`,
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
						`Error listing files in folder ${Utils.diskPath(
							folderPath,
						)}: ${errorMessage}`,
					)
				}
			}

			// Get the next page link (incase One Drive returned incomplete
			// results)
			nextPageLink = listResult.data['@odata.nextLink']

			// Add the files we got right now to the main list
			if (listResult.data.value) {
				allFiles = [...allFiles, ...listResult.data.value]
			}
		} while (nextPageLink && allFiles.length <= 50) // Keep doing the
		// above list request until there is no nextPageLink returned or the max
		// result limit is reached

		// Once we get everything, parse and print the files
		if (allFiles.length > 0) {
			// If a valid result is returned, loop through all the files and folders there
			let results: Array<DabbuResource> = []
			for (let i = 0, { length } = allFiles; i < length; i++) {
				const fileObject = allFiles[i]

				// Append to a final array that will be returned
				results.push(
					convertOneDriveFileToDabbuResource(
						fileObject,
						folderPath,
						isShared,
						queries.exportType,
					),
				)
			}

			// Sort the array now
			results = Utils.sortDabbuResources(
				results,
				queries as DabbuListRequestOptions,
			)

			// Return all the files as a final array
			return { code: 200, content: results, nextSetToken: nextPageLink }
		}

		// Else it is an empty folder
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
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the Authorization header
		Guards.checkAccessToken(headers)

		// If an access token is present, create an axios httpClient with the access
		// token in the Authorization header
		const httpClient = axios.create({
			baseURL: 'https://graph.microsoft.com/v1.0/',
			headers: {
				Authorization:
					headers['Authorization'] || headers['authorization'],
			},
		})

		// Start parsing the file path and the options
		// Get the folder path from the URL
		const folderPath = Utils.diskPath(
			parameters.folderPath.replace('Shared', ''),
		)
		// Get the file path from the URL
		const { fileName } = parameters
		// Is the file shared (explicitly or implicitly)
		const isShared =
			Utils.diskPath(parameters.folderPath).startsWith('/Shared') ||
			Utils.diskPath(parameters.folderPath).startsWith('Shared')

		// Don't allow relative paths, let clients do that
		Guards.checkRelativePath(parameters.folderPath, parameters.fileName)

		// Create the query
		const fetchQuery = isShared
			? `/me/drive/sharedWithMe:${Utils.diskPath(
					folderPath,
					fileName,
			  )}:`
			: `/me/drive/root:${Utils.diskPath(folderPath, fileName)}`

		// Fetch the results
		let fetchResult
		try {
			fetchResult = await httpClient.get(fetchQuery)
		} catch (error) {
			if (error.response.status === 401) {
				// If it is a 401, throw an invalid credentials error
				throw new InvalidCredentialsError('Invalid access token')
			} else if (error.response.status === 404) {
				// If it is a 404, throw a not found error
				throw new NotFoundError(
					`The file ${Utils.diskPath(
						folderPath,
						fileName,
					)} does not exist`,
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
					`Error while fetching file ${Utils.diskPath(
						folderPath,
						fileName,
					)}: ${errorMessage}`,
				)
			}
		}

		// Parse the result and return a file object
		if (fetchResult.data) {
			// Parse the returned object
			const fileObject = fetchResult.data

			// Then Return it
			return {
				code: 200,
				content: convertOneDriveFileToDabbuResource(
					fileObject,
					folderPath,
					isShared,
					queries.exportType,
				),
			}
		} else {
			// Throw an error
			throw new ProviderInteractionError(
				'Error: received no file data from OneDrive API',
			)
		}
	}

	// Upload a file to the specified location
	async create(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		fileMetadata: MulterFile,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the Authorization header
		Guards.checkAccessToken(headers)

		// If an access token is present, create an axios httpClient with the access
		// token in the Authorization header
		const httpClient = axios.create({
			baseURL: 'https://graph.microsoft.com/v1.0/',
			headers: {
				Authorization:
					headers['Authorization'] || headers['authorization'],
			},
		})

		// Start parsing the file path and the options
		// Get the folder path from the URL
		const folderPath = Utils.diskPath(parameters.folderPath)
		// Get the file path from the URL
		const { fileName } = parameters

		// Don't allow relative paths, let clients do that
		Guards.checkRelativePath(parameters.folderPath, parameters.fileName)

		// Check if there is a file uploaded
		if (!fileMetadata) {
			// If not, error out
			throw new MissingParameterError(
				'Missing file data under content param in request body',
			)
		}

		let result

		// Run a PUT request to upload the file contents to a new file. Also, we
		// don't need to create folders if they don't exist, One Drive does that
		// for us
		// Get the mime type of the file
		const mimeType = (
			(await FileType.fromFile(fileMetadata.path)) || {}
		).mime

		// Upload the file
		try {
			result = await httpClient.put(
				`/me/drive/root:${Utils.diskPath(
					folderPath,
					fileName,
				)}:/content`,
				Fs.createReadStream(fileMetadata.path),
				{
					headers: {
						'Content-Type': mimeType,
					},
				},
			)
		} catch (error) {
			if (error.response.status === 401) {
				// If it is a 401, throw an invalid credentials error
				throw new InvalidCredentialsError('Invalid access token')
			} else {
				// Return a proper error message
				const errorMessage =
					error.response.data &&
					error.response.data.error &&
					error.response.data.error.message
						? error.response.data.error.message
						: 'Unknown error'
				throw new ProviderInteractionError(
					`Error while creating file ${Utils.diskPath(
						folderPath,
						fileName,
					)}: ${errorMessage}`,
				)
			}
		}

		// Update the files metadata with the given fields
		const meta: Record<string, any> = {}
		// If there is a lastModifiedTime present, set the file's lastModifiedTime to that
		if (body.lastModifiedTime) {
			meta.lastModifiedTime = new Date(
				body.lastModifiedTime,
			).toISOString()
		}

		// If there is a createdAtTime present, set the file's createdAtTime to that
		if (body.createdAtTime) {
			meta.createdAtTime = new Date(body.createdAtTime).toISOString()
		}

		// Update the files metadata with the given fields
		if (meta.lastModifiedTime || meta.createdAtTime) {
			// Run a patch request to update the metadata
			try {
				result = await httpClient.patch(
					`/me/drive/root:${Utils.diskPath(folderPath, fileName)}:/`,
					{
						fileSystemInfo: {
							createdDateTime: meta.createdAtTime,
							lastModifiedDateTime: meta.lastModifiedTime,
						},
					},
				)
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else {
					// Return a proper error message
					const errorMessage =
						error.response.data &&
						error.response.data.error &&
						error.response.data.error.message
							? error.response.data.error.message
							: 'Unknown error'
					throw new ProviderInteractionError(
						`Error while setting lastModifiedTime or createdAtTime (${
							meta.lastModifiedTime || '<none>'
						} or ${
							meta.createdAtTime || '<none>'
						}) on the file ${Utils.diskPath(
							folderPath,
							fileName,
						)}: ${errorMessage}`,
					)
				}
			}
		}

		if (result.data) {
			return {
				code: 201,
				content: convertOneDriveFileToDabbuResource(
					result.data,
					folderPath,
					false,
					body.exportType,
				),
			}
		}

		// Else throw an error
		throw new ProviderInteractionError(
			'No response from One Drive. Cancelling file upload.',
		)
	}

	// Update the file at the specified location
	async update(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		fileMetadata: MulterFile,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the Authorization header
		Guards.checkAccessToken(headers)

		// If an access token is present, create an axios httpClient with the access
		// token in the Authorization header
		const httpClient = axios.create({
			baseURL: 'https://graph.microsoft.com/v1.0/',
			headers: {
				Authorization:
					headers['Authorization'] || headers['authorization'],
			},
		})

		// Start parsing the file path and the options
		// Get the folder path from the URL
		let folderPath = Utils.diskPath(parameters.folderPath)
		// Get the file path from the URL
		let { fileName } = parameters

		// Don't allow relative paths, let clients do that
		Guards.checkRelativePath(parameters.folderPath, parameters.fileName)

		// The result of the operation
		let result

		// Upload the new file data if provided
		if (fileMetadata) {
			// Run a PUT request to upload the file contents to a new file. Also, we
			// don't need to create folders if they don't exist, One Drive does that
			// for us
			// Get the mime type of the file
			const mimeType = (
				(await FileType.fromFile(fileMetadata.path)) || {}
			).mime

			// Upload the file
			try {
				result = await httpClient.put(
					`/me/drive/root:${Utils.diskPath(
						folderPath,
						fileName,
					)}:/content`,
					Fs.createReadStream(fileMetadata.path),
					{
						headers: {
							'Content-Type': mimeType,
						},
					},
				)
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else if (error.response.status === 404) {
					// If it is a 404, throw a not found error
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file`,
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
						`Error while updating content of file ${Utils.diskPath(
							folderPath,
							fileName,
						)}: ${errorMessage}`,
					)
				}
			}
		}

		// Check if the user passed fields to set values in
		// We can set name, path, createdAtTime and lastModifiedTime
		if (body.name) {
			// Rename the file by sending a patch request
			try {
				result = await httpClient.patch(
					`/me/drive/root:${Utils.diskPath(folderPath, fileName)}:/`,
					{
						name: body.name,
					},
				)
				fileName = body.name
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else if (error.response.status === 404) {
					// If it is a 404, throw a not found error
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file`,
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
						`Error while updating name of file ${Utils.diskPath(
							folderPath,
							fileName,
						)} to ${body.name}: ${errorMessage}`,
					)
				}
			}
		}

		if (body.path) {
			// Don't allow relative paths, let clients do that
			if (body.path.includes('/..') || body.path.includes('/..')) {
				throw new BadRequestError(
					'Folder paths must not contain relative paths',
				)
			}

			// Set the new parent on the file
			// First get the ID of the new folder
			try {
				result = await httpClient.get(
					`/me/drive/root:${Utils.diskPath(body.path)}:/`,
				)
			} catch (err) {
				// If there is no folder, create one
				result = await httpClient.put(
					`/me/drive/root:${Utils.diskPath(body.path)}:/`,
					{
						folder: {},
					},
				)
			}
			// Then set it on the file
			try {
				result = await httpClient.patch(
					`/me/drive/root:${Utils.diskPath(folderPath, fileName)}:/`,
					{
						parentReference: {
							id: result.data.id,
						},
					},
				)
				folderPath = body.path
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else if (error.response.status === 404) {
					// If it is a 404, throw a not found error
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file`,
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
						`Error while moving (updating path for) file ${Utils.diskPath(
							folderPath,
							fileName,
						)} to ${body.path}: ${errorMessage}`,
					)
				}
			}
		}

		if (body.lastModifiedTime) {
			// Turn it into a ISO string
			const modifiedDate = new Date(body.lastModifiedTime).toISOString()
			// Set the lastModifiedTime by sending a patch request
			try {
				result = await httpClient.patch(
					`/me/drive/root:${Utils.diskPath(folderPath, fileName)}:/`,
					{
						fileSystemInfo: {
							lastModifiedDateTime: modifiedDate,
						},
					},
				)
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else if (error.response.status === 404) {
					// If it is a 404, throw a not found error
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file`,
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
						`Error updating lastModifiedTime of file ${Utils.diskPath(
							folderPath,
							fileName,
						)} to ${modifiedDate}: ${errorMessage}`,
					)
				}
			}
		}

		if (body.createdAtTime) {
			// Turn it into a ISO string
			const createdDate = new Date(body.createdAtTime).toISOString()
			// Set the createdAtTime by sending a patch request
			try {
				result = await httpClient.patch(
					`/me/drive/root:${Utils.diskPath(folderPath, fileName)}:/`,
					{
						fileSystemInfo: {
							createdDateTime: createdDate,
						},
					},
				)
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else if (error.response.status === 404) {
					// If it is a 404, throw a not found error
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file`,
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
						`Error while updating createdAtTime of file ${Utils.diskPath(
							folderPath,
							fileName,
						)} to ${createdDate}: ${errorMessage}`,
					)
				}
			}
		}

		if (result && result.data) {
			return {
				code: 200,
				content: convertOneDriveFileToDabbuResource(
					result.data,
					folderPath,
					false,
					body.exportType,
				),
			}
		}

		// If there was nothing mentioned in the request body, error out
		throw new MissingParameterError(
			'No field to update (name, path, content, or lastModifiedTime) was found in the request body',
		)
	}

	// Delete the file/folder at the specified location
	async delete(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
	): Promise<DabbuResponse> {
		// Check that the request has an access token in the Authorization header
		Guards.checkAccessToken(headers)

		// If an access token is present, create an axios httpClient with the access
		// token in the Authorization header
		const httpClient = axios.create({
			baseURL: 'https://graph.microsoft.com/v1.0/',
			headers: {
				Authorization:
					headers['Authorization'] || headers['authorization'],
			},
		})

		// Start parsing the file path and the options
		// Get the folder path from the URL
		const folderPath = Utils.diskPath(parameters.folderPath)
		// Get the file path from the URL
		const { fileName } = parameters

		// Don't allow relative paths, let clients do that
		Guards.checkRelativePath(parameters.folderPath, parameters.fileName)

		if (folderPath && fileName) {
			// If there is a file name provided, delete the file
			try {
				await httpClient.delete(
					`/me/drive/root:${Utils.diskPath(folderPath, fileName)}`,
				)
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else if (error.response.status === 404) {
					// If it is a 404, throw a not found error
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file`,
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
						`Error while deleting file ${Utils.diskPath(
							folderPath,
							fileName,
						)}: ${errorMessage}`,
					)
				}
			}

			return {
				code: 204,
			}
		}

		if (folderPath && !fileName) {
			// If there is only a folder name provided, delete the folder
			try {
				await httpClient.delete(
					`/me/drive/root:${Utils.diskPath(folderPath)}`,
				)
			} catch (error) {
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidCredentialsError('Invalid access token')
				} else if (error.response.status === 404) {
					// If it is a 404, throw a not found error
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file`,
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
						`Error while deleting folder ${Utils.diskPath(
							folderPath,
						)}: ${errorMessage}`,
					)
				}
			}

			return {
				code: 204,
			}
		}

		// Else error out
		throw new BadRequestError(
			'Must provide either folder path or file path to delete',
		)
	}
}
