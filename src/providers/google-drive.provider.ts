// Use the axios library to make network requests
import axios, { AxiosInstance } from 'axios'
// Use the file type library to determine the mime type of a file
import FileType from 'file-type'
// Use the filesystem library to read uploaded file contents
import * as Fs from 'fs-extra'

// Implement the DataProvider interface
import DataProvider from '../provider'

// Import errors and utility functions
import {
	BadRequestError,
	FileExistsError,
	InvalidProviderCredentialsError,
	MissingParameterError,
	NotFoundError,
	ProviderInteractionError,
} from '../utils/errors.util'
import * as Utils from '../utils/general.util'
import * as Guards from '../utils/guards.util'
// Import the logger
import Logger from '../utils/logger.util'

// Convert the JSON object returned by the Drive API to a Dabbu DabbuResource
function convertDriveFileToDabbuResource(
	fileObject: Record<string, any>,
	folderPath: string,
	isShared: boolean,
	exportType: string | undefined,
): DabbuResource {
	// Name of the file
	const name = fileObject.title as string
	// File or folder
	const kind: 'file' | 'folder' =
		fileObject.mimeType === 'application/vnd.google-apps.folder'
			? 'folder'
			: 'file'
	// Absolute path to the file
	const path = isShared
		? Utils.diskPath('/Shared', folderPath, name)
		: Utils.diskPath(folderPath, name)
	// Mime type
	const mimeType = fileObject.mimeType as string
	// Size in bytes, let clients convert to whatever unit they want
	const size = Number(fileObject.fileSize)
	// When it was created
	const createdAtTime = new Date(fileObject.createdDate).toISOString()
	// Last time the file or its metadata was changed
	const lastModifiedTime = new Date(
		fileObject.modifiedDate,
	).toISOString()
	const exportMimeType = getExportTypeForDoc(mimeType)
	let contentUri = ''
	// If the export type is view, return an "Open in Google Editor" link
	if (exportType === 'view') {
		contentUri = `https://drive.google.com/open?id=${fileObject.id}`
	} else {
		// Else:
		// First check that if it is Google Doc/Sheet/Slide/Drawing/App
		// Script
		if (
			exportType &&
			fileObject.exportLinks &&
			fileObject.exportLinks[exportType]
		) {
			// If the requested export type is in the exportLinks field, return
			// that link
			contentUri = fileObject.exportLinks[exportType]
		} else if (
			exportType === 'media' &&
			exportMimeType &&
			fileObject.exportLinks &&
			fileObject.exportLinks[exportMimeType]
		) {
			// Else return the donwload link for the default export type
			contentUri = fileObject.exportLinks[exportMimeType]
		} else {
			// Else give the googleapis.com link (doesn't work for Google Workspace Files)
			contentUri = `https://www.googleapis.com/drive/v3/files/${fileObject.id}?alt=media`
		}
	}

	return {
		name,
		kind,
		provider: 'googledrive',
		path,
		mimeType,
		size,
		createdAtTime,
		lastModifiedTime,
		contentUri,
	}
}

// Get the folder ID based on its name
async function getFolderId(
	httpClient: AxiosInstance,
	folderName: string,
	parentId = 'root',
	isShared = false,
	insertIfNotFound = false,
): Promise<string> {
	// If it's the root folder, return `root` as the ID
	if (folderName === '/') {
		return 'root'
	}

	// Query the Drive API
	let result
	try {
		// eslint-disable-next-line prefer-const
		result = await httpClient.get('/drive/v2/files', {
			params: {
				q: isShared
					? `title = '${folderName.replace(
							/'/g,
							"\\'",
					  )}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and sharedWithMe = true`
					: `'${parentId}' in parents and title = '${folderName.replace(
							/'/g,
							"\\'",
					  )}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
				fields: 'items(id, title)',
			},
		})
	} catch (error) {
		Logger.error(
			`provider.googledrive.getFolderId: error occurred while getting folder ID: name: ${folderName}; parentId: ${parentId}; isShared: ${isShared}; error: ${Utils.json(
				error,
			)}`,
		)
		if (error.response.status === 401) {
			// If it is a 401, throw an invalid credentials error
			throw new InvalidProviderCredentialsError('Invalid access token')
		} else {
			// Return a proper error message
			const errorMessage =
				error.response.data &&
				error.response.data.error &&
				error.response.data.error.message
					? error.response.data.error.message
					: 'Unknown error'
			throw new ProviderInteractionError(
				`Error retrieving folder ID for folder ${folderName}: ${errorMessage}`,
			)
		}
	}

	if (result.data.items.length > 0) {
		// If there is a valid result, return the folder ID
		const folderId = result.data.items[0].id
		return folderId
	}

	// There is no such folder
	if (insertIfNotFound) {
		// Insert a folder if the `insertIfNotFound` option is true
		let newFolderResult
		try {
			// eslint-disable-next-line prefer-const
			newFolderResult = await httpClient.post('/drive/v2/files', {
				title: folderName,
				parents: [{ id: parentId }],
				mimeType: 'application/vnd.google-apps.folder',
			})
		} catch (error) {
			Logger.error(
				`provider.googledrive.getFolderId: error occurred while creating folder ${folderName}: parentId: ${parentId}; error: ${Utils.json(
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
					`Error creating folder ${folderName}: ${errorMessage}`,
				)
			}
		}

		if (newFolderResult.data && newFolderResult.data.id) {
			return newFolderResult.data.id
		} else {
			throw new ProviderInteractionError(
				'Error: received no folder ID from Google Drive API upon folder creation',
			)
		}
	} else {
		// Else error out
		throw new NotFoundError(`Folder ${folderName} does not exist`)
	}
}

// Get the folder ID of the last folder in the path
async function getFolderWithParents(
	httpClient: AxiosInstance,
	folderPath: string,
	isShared = false,
	insertIfNotFound = false,
): Promise<string> {
	// If it's the root folder, return `root` as the ID
	if (folderPath === '/') {
		return 'root'
	}

	// Else sanitise the folder path by removing empty names
	const folderNames = folderPath.split('/')
	let i = 0
	while (i < folderNames.length) {
		if (folderNames[i] === '') {
			folderNames.splice(i, 1)
		}

		i++
	}

	if (folderNames.length > 1) {
		// If the path has multiple folders, loop through them, get their IDs and
		// then get the next folder ID with it as a parent
		let previousFolderId = 'root'
		for (let j = 0, { length } = folderNames; j < length; j++) {
			// Don't set sharedWithMe here to true if this is not the first folder,
			// because then the folder is implicitly shared as part of the first
			// folder
			// eslint-disable-next-line no-await-in-loop
			previousFolderId = await getFolderId(
				httpClient,
				folderNames[j],
				previousFolderId,
				isShared && j === 0,
				insertIfNotFound,
			)
		}

		// Return the ID of the last folder
		return previousFolderId
	}

	// Return the last and only folder's ID
	// Set sharedWithMe here to true (if passed on as true) as the folder will
	// have been explicitly shared
	const folderId = await getFolderId(
		httpClient,
		folderNames[folderNames.length - 1],
		'root',
		isShared,
		insertIfNotFound,
	)
	return folderId
}

// Get the ID of a file based on its name
async function getFileId(
	httpClient: AxiosInstance,
	fileName: string,
	parentId = 'root',
	isShared = false,
	errorOutIfExists = false,
): Promise<string | undefined> {
	// Query the Drive API
	let result
	try {
		// eslint-disable-next-line prefer-const
		result = await httpClient.get('/drive/v2/files', {
			params: {
				q: isShared
					? `title = '${fileName.replace(
							/'/g,
							"\\'",
					  )}' and sharedWithMe = true and trashed = false`
					: `'${parentId}' in parents and title = '${fileName.replace(
							/'/g,
							"\\'",
					  )}' and trashed = false`,
				fields: 'items(id, title)',
			},
		})
	} catch (error) {
		Logger.error(
			`provider.googledrive.getFileId: error occurred while getting file ID: fileName: ${fileName}; parentId: ${parentId}; isShared: ${isShared}; error: ${Utils.json(
				error,
			)}`,
		)
		if (error.response.status === 401) {
			// If it is a 401, throw an invalid credentials error
			throw new InvalidProviderCredentialsError('Invalid access token')
		} else {
			// Return a proper error message
			const errorMessage =
				error.response.data &&
				error.response.data.error &&
				error.response.data.error.message
					? error.response.data.error.message
					: 'Unknown error'
			throw new ProviderInteractionError(
				`Error retrieving file ID for file ${fileName}: ${errorMessage}`,
			)
		}
	}

	if (result.data.items.length > 0) {
		// If there is a valid result:
		if (errorOutIfExists) {
			// If the `errorOutIfExists` option is true (used when creating a file),
			// error out
			throw new FileExistsError(`File ${fileName} already exists`)
		} else {
			// Else return the file ID
			const fileId = result.data.items[0].id
			return fileId
		}
	} else {
		// File doesn't exist
		// eslint-disable-next-line no-lonely-if
		if (!errorOutIfExists) {
			// If the `errorOutIfExists` option is false (used when creating a file),
			// error out
			throw new NotFoundError(`File ${fileName} does not exist`)
		}
	}
}

// Get the file ID of a file with a folder path before it
async function getFileWithParents(
	httpClient: AxiosInstance,
	filePath: string,
	isShared = false,
): Promise<string | undefined> {
	// Parse the path
	const folderNames = filePath.split('/')
	// Get the file name and remove it from the folder path
	const fileName = folderNames.pop()!

	// Sanitize the folder names by removing empty folder namess
	let i = 0
	while (i < folderNames.length) {
		if (folderNames[i] === '') {
			folderNames.splice(i, 1)
		}

		i++
	}

	if (folderNames.length > 0) {
		// If the path has multiple folders, loop through them, get their IDs and
		// then get the next folder ID with it as a parent
		let previousFolderId = 'root'
		for (let j = 0, { length } = folderNames; j < length; j++) {
			// Don't set sharedWithMe here to true if this is not the first folder,
			// because then the folder is implicitly shared as part of the first
			// folder
			// eslint-disable-next-line no-await-in-loop
			previousFolderId = await getFolderId(
				httpClient,
				folderNames[j],
				previousFolderId,
				isShared && j === 0,
			)
		}

		// Return the file ID with the parent ID being the last folder's ID
		// Don't set sharedWithMe here to true, because the file is implicitly
		// shared as part of a main folder
		const fileId = await getFileId(
			httpClient,
			fileName,
			previousFolderId,
		)
		// Return the file ID
		return fileId
	}

	// Get the file ID
	// Set sharedWithMe here to true (if passed on as true) as the
	// file will have been explicitly shared
	const fileId = await getFileId(httpClient, fileName, 'root', isShared)
	// Return the file ID
	return fileId
}

// Get a valid mime type to export the file to for certain Google Workspace
// files
function getExportTypeForDoc(fileMimeType: string): string | undefined {
	// Google Docs ---> Microsoft Word (docx)
	if (fileMimeType === 'application/vnd.google-apps.document') {
		return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	}
	// Google Sheets ---> Microsoft Excel (xlsx)
	if (fileMimeType === 'application/vnd.google-apps.spreadsheet') {
		return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	}
	// Google Slides ---> Microsoft Power Point (pptx)
	if (fileMimeType === 'application/vnd.google-apps.presentation') {
		return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
	}
	// Google Drawing ---> PNG Image (png)
	if (fileMimeType === 'application/vnd.google-apps.drawing') {
		return 'image/png'
	}
	// Google App Script ---> JSON (json)
	if (fileMimeType === 'application/vnd.google-apps.script+json') {
		return 'application/json'
	}
	// Google Maps and other types are not yet supported, as they can't
	// be converted to something else yet
	return
}

// Get a valid mime type to import the file to for certain MS Office files
function getImportTypeForDoc(fileMimeType: string): string | undefined {
	// Microsoft Word (docx) ---> Google Docs
	if (
		fileMimeType ===
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	) {
		return 'application/vnd.google-apps.document'
	}
	// Microsoft Excel (xlsx) ---> Google Sheets
	if (
		fileMimeType ===
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	) {
		return 'application/vnd.google-apps.spreadsheet'
	}
	// Microsoft Power Point (pptx) ---> Google Slides
	if (
		fileMimeType ===
		'application/vnd.openxmlformats-officedocument.presentationml.presentation'
	) {
		return 'application/vnd.google-apps.presentation'
	}
	// Else return nothing, we cannot convert the file
	return
}

export default class GoogleDriveDataProvider implements DataProvider {
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
		// Check if the file shared
		const isShared =
			Utils.diskPath(parameters.folderPath).startsWith('/Shared') ||
			Utils.diskPath(parameters.folderPath).startsWith('Shared')
		// Get the folder path from the URL and replace the /Shared part if it is
		// in the beginning
		const folderPath = Utils.diskPath(
			isShared
				? parameters.folderPath.replace('Shared', '')
				: parameters.folderPath,
		)
		// Get the export type and compare/sort params from the query parameters
		const sortAndFilterOptions = queries as DabbuListRequestOptions

		// Don't allow relative paths, let clients do that
		Guards.checkRelativePath(parameters.folderPath, parameters.fileName)

		// Get the folder ID (exception is if the folder is shared)
		const folderId = await getFolderWithParents(
			httpClient,
			folderPath,
			isShared,
		)

		// Construct the query
		const q =
			Utils.diskPath(parameters.folderPath) === '/Shared'
				? 'trashed = false and sharedWithMe = true'
				: `'${folderId}' in parents and trashed = false`

		// Query the Drive API
		let allFiles: Array<Record<string, any>> = []
		let nextPageToken = queries.nextSetToken as string | undefined
		do {
			// List all files that match the given query
			let listResult
			try {
				// eslint-disable-next-line no-await-in-loop
				// eslint-disable-next-line prefer-const
				listResult = await httpClient.get('/drive/v2/files', {
					params: {
						q,
						fields:
							'nextPageToken, items(id, title, mimeType, fileSize, createdDate, modifiedDate, webContentLink, exportLinks)',
						pageSize: 50, // Get a max of 50 files at a time
						pageToken: nextPageToken, // Add the page token if there is any
					},
				})
			} catch (error) {
				Logger.error(
					`provider.googledrive.list: error occurred while listing files in folder ${folderId}: q: ${q}; error: ${Utils.json(
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
					throw new NotFoundError(
						`The folder ${folderPath} (ID: ${folderId}) does not exist`,
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
						`Error listing files in folder ${folderPath} (ID: ${folderId}): ${errorMessage}`,
					)
				}
			}

			// Get the next page token (incase Google Drive returned incomplete
			// results)
			nextPageToken = listResult.data.nextPageToken

			// Add the files we got right now to the main list
			if (listResult.data.items) {
				allFiles = [...allFiles, ...listResult.data.items]
			}
		} while (nextPageToken && allFiles.length <= 50) // Keep doing the
		// above list request until there is no nextPageToken returned or the max
		// result limit is reached

		// Once we get everything, parse and print the files
		if (allFiles.length > 0) {
			// If a valid result is returned, loop through all the files and folders
			// there
			let resources: Array<DabbuResource> = []
			for (let i = 0, { length } = allFiles; i < length; i++) {
				const fileObject = allFiles[i]

				// Append to a final array that will be returned
				resources.push(
					convertDriveFileToDabbuResource(
						fileObject,
						folderPath,
						isShared,
						queries.exportType,
					),
				)
			}

			// Sort the array now
			resources = Utils.sortDabbuResources(
				resources,
				sortAndFilterOptions,
			)

			// Return all the files as a final array
			return {
				code: 200,
				content: resources,
				nextSetToken: nextPageToken,
			}
		}

		// Empty folder
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

		// Get the parent folder ID
		const folderId = await getFolderWithParents(
			httpClient,
			folderPath,
			isShared,
		)

		// Construct the query
		let q
		if (Utils.diskPath(parameters.folderPath) === '/Shared') {
			// If the folder path is /Shared, the file has been shared individually.
			q = `title = '${fileName.replace(
				/'/g,
				"\\'",
			)}' and trashed = false and sharedWithMe = true`
		} else {
			// Else just do a normal get
			q = `title = '${fileName.replace(
				/'/g,
				"\\'",
			)}' and '${folderId}' in parents and trashed = false`
		}

		// Query the Drive API
		// No need to do the pagination thing here, our query is specifically
		// searching for a file
		let listResult
		try {
			// eslint-disable-next-line prefer-const
			listResult = await httpClient.get('/drive/v2/files', {
				params: {
					q,
					fields:
						'items(id, title, mimeType, fileSize, createdDate, modifiedDate, defaultOpenWithLink, webContentLink, exportLinks)',
				},
			})
		} catch (error) {
			Logger.error(
				`provider.googledrive.read: error occurred while getting data for file ${fileName}: q: ${q}; error: ${Utils.json(
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
					`Error fetching file ${Utils.diskPath(
						folderPath,
						fileName,
					)}: ${errorMessage}`,
				)
			}
		}

		if (listResult.data.items.length > 0) {
			// If we get a valid result
			// Get the file metadata and content
			const fileObject = listResult.data.items[0] as Record<string, any>

			// Return the file metadata and content
			return {
				code: 200,
				content: convertDriveFileToDabbuResource(
					fileObject,
					folderPath,
					isShared,
					queries.exportType,
				),
			}
		} else {
			// Throw an error
			throw new ProviderInteractionError(
				`Error: received no data about file from Google Drive API`,
			)
		}
	}

	// Upload a file to the specified location
	async create(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
		fileMetadata: MulterFile,
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
		// Get the folder path from the URL
		const folderPath = Utils.diskPath(parameters.folderPath)
		// Get the file name from the URL
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

		// Get the folder ID
		const folderId = await getFolderWithParents(
			httpClient,
			folderPath,
			false,
			true,
		)

		// Check if the file already exists
		await getFileId(httpClient, fileName, folderId, false, true)

		// Construct the metadata of the file
		const meta: Record<string, any> = {
			title: fileName,
			parents: [{ id: folderId }],
			mimeType: ((await FileType.fromFile(fileMetadata.path)) || {})
				.mime,
		}

		// If there is a lastModifiedTime present, set the file's lastModifiedTime
		// to that
		if (body.lastModifiedTime) {
			meta.modifiedDate = Utils.formatDate(
				new Date(body.lastModifiedTime),
			)
		}

		// First, post the file meta data to let Google Drive know we are posting
		// the file's contents too
		let driveMetaResult
		try {
			// eslint-disable-next-line prefer-const
			driveMetaResult = await httpClient.post(
				'/drive/v2/files?modifiedDateBehavior=fromBody',
				meta,
			)
		} catch (error) {
			Logger.error(
				`provider.googledrive.create: error occurred while posting metadata (step 1 create): meta: ${Utils.json(
					meta,
				)}; error: ${Utils.json(error)}`,
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
					`Error while sending file metadata to Google Drive: '${meta}': ${errorMessage}`,
				)
			}
		}
		// If the operation was successfull, upload the file too
		if (driveMetaResult.data) {
			// If drive acknowledges the request, then upload the file as well
			let file = driveMetaResult.data
			// Upload the file's content
			let result
			try {
				result = await httpClient.put(
					`/upload/drive/v2/files/${file.id}?uploadType=media`,
					Fs.createReadStream(fileMetadata.path),
				)
			} catch (error) {
				Logger.error(
					`provider.googledrive.create: error occurred while posting file contents (step 2 create): fileId: ${
						file.id
					}; error: ${Utils.json(error)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else {
					const errorMessage =
						error.response.data &&
						error.response.data.error &&
						error.response.data.error.message
							? error.response.data.error.message
							: 'Unknown error'
					throw new ProviderInteractionError(
						`Error while uploading file content to Google Drive: ${errorMessage}`,
					)
				}
			}
			if (result.data) {
				// If the uploaded file is an MS Office file, convert it to a Google
				// Doc/Sheet/Slide
				const importType = getImportTypeForDoc(result.data.mimeType)
				if (importType) {
					// Copy the file in a converted format
					try {
						result = await httpClient.post(
							`/drive/v2/files/${file.id}/copy?convert=true`,
						)
						// Delete the original one
						await httpClient.delete(`/drive/v2/files/${file.id}`)
						// The new file object
						file = result.data
					} catch (error) {
						Logger.error(
							`provider.googledrive.create: error occurred while converting file to google format: importType: ${importType}; original file: ${Utils.json(
								result.data,
							)}; error: ${Utils.json(error)}`,
						)
						if (error.response.status === 401) {
							// If it is a 401, throw an invalid credentials error
							throw new InvalidProviderCredentialsError(
								'Invalid access token',
							)
						} else {
							const errorMessage =
								error.response.data &&
								error.response.data.error &&
								error.response.data.error.message
									? error.response.data.error.message
									: 'Unknown error'
							throw new ProviderInteractionError(
								`Error while converting file to Google Workspace (Docs/Sheets/Slides) format: ${errorMessage}`,
							)
						}
					}
				}

				// Set the last modified time on it again, if needed
				try {
					result = await httpClient.patch(
						`/drive/v2/files/${file.id}?modifiedDateBehavior=fromBody`,
						{
							modifiedDate: meta.modifiedDate,
						},
					)
				} catch (error) {
					Logger.error(
						`provider.googledrive.create: error occurred while updating lastModifedTime again: meta: ${Utils.json(
							meta,
						)}; error: ${Utils.json(error)}`,
					)
					if (error.response.status === 401) {
						// If it is a 401, throw an invalid credentials error
						throw new InvalidProviderCredentialsError(
							'Invalid access token',
						)
					} else {
						const errorMessage =
							error.response.data &&
							error.response.data.error &&
							error.response.data.error.message
								? error.response.data.error.message
								: 'Unknown error'
						throw new ProviderInteractionError(
							`Error while setting lastModifiedTime (${
								meta.modifiedDate
							}) on file ${Utils.diskPath(folderPath, fileName)} (ID: ${
								file.id
							}): ${errorMessage}`,
						)
					}
				}

				// If the creation was successful, return a file object
				if (result.data) {
					const fileObject = result.data

					// Return the file metadata and content
					return {
						code: 201,
						content: convertDriveFileToDabbuResource(
							fileObject,
							folderPath,
							false,
							body.exportType,
						),
					}
				}
			}

			// Else throw an error
			throw new ProviderInteractionError(
				'Error while uploading file to Google Drive.',
			)
		}

		// Else throw an error
		throw new ProviderInteractionError(
			'No response from Google Drive. Cancelling file upload.',
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
		// Get the folder path from the URL
		let folderPath = Utils.diskPath(parameters.folderPath)
		// Get the file path from the URL
		let { fileName } = parameters

		// Don't allow relative paths, let clients do that
		Guards.checkRelativePath(parameters.folderPath, parameters.fileName)

		// Get the folder and file ID
		const folderId = await getFolderWithParents(
			httpClient,
			folderPath,
			false,
			false,
		)
		let fileId = await getFileId(
			httpClient,
			fileName,
			folderId,
			false,
			false,
		)

		// The result of the operation
		let result

		// Upload the new file data if provided
		if (fileMetadata) {
			try {
				result = await httpClient.put(
					`/upload/drive/v2/files/${fileId}?uploadType=media`,
					Fs.createReadStream(fileMetadata.path),
					{
						headers: {
							'Content-Type': (
								(await FileType.fromFile(fileMetadata.path)) || {}
							).mime,
						},
					},
				)
			} catch (error) {
				Logger.error(
					`provider.googledrive.update: error occurred while updating file content: fileId: ${fileId}; error: ${Utils.json(
						error,
					)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else if (error.response.status === 404) {
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file.`,
					)
				} else {
					const errorMessage =
						error.response.data &&
						error.response.data.error &&
						error.response.data.error.message
							? error.response.data.error.message
							: 'Unknown error'
					throw new ProviderInteractionError(
						`Error while updating content for file ${Utils.diskPath(
							folderPath,
							fileName,
						)} (ID: ${fileId}): ${errorMessage}`,
					)
				}
			}

			if (result.data) {
				// If the uploaded file is an MS Office file, convert it to a Google
				// Doc/Sheet/Slide
				const importType = getImportTypeForDoc(result.data.mimeType)
				if (importType) {
					// Copy the file in a converted format
					try {
						result = await httpClient.post(
							`/drive/v2/files/${fileId}/copy?convert=true`,
						)
						// Delete the original one
						await httpClient.delete(`/drive/v2/files/${fileId}`)
						// The new file ID
						fileId = result.data.id
					} catch (error) {
						Logger.error(
							`provider.googledrive.update: error occurred while converting file to google format: importType: ${importType}; original file: ${Utils.json(
								result.data,
							)}; error: ${Utils.json(error)}`,
						)
						if (error.response.status === 401) {
							// If it is a 401, throw an invalid credentials error
							throw new InvalidProviderCredentialsError(
								'Invalid access token',
							)
						} else if (error.response.status === 404) {
							throw new NotFoundError(
								`File ${Utils.diskPath(
									folderPath,
									fileName,
								)} does not exist, could not update file.`,
							)
						} else {
							const errorMessage =
								error.response.data &&
								error.response.data.error &&
								error.response.data.error.message
									? error.response.data.error.message
									: 'Unknown error'
							throw new ProviderInteractionError(
								`Error while converting file ${Utils.diskPath(
									folderPath,
									fileName,
								)} (ID: ${fileId}) to Google Workspace (Docs/Slides/Sheets) format: ${errorMessage}`,
							)
						}
					}
				}
			}
		}

		// Check if the user passed fields to set values in
		// We can only set name, path, and lastModifiedTime, not createdAtTime
		if (body.name) {
			// Rename the file by sending a patch request
			try {
				result = await httpClient.patch(`/drive/v2/files/${fileId}`, {
					title: body.name,
				})
				fileName = body.name
			} catch (error) {
				Logger.error(
					`provider.googledrive.update: error occurred while renaming file: fileId: ${fileId}; body: ${Utils.json(
						body,
					)}; error: ${Utils.json(error)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else if (error.response.status === 404) {
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file.`,
					)
				} else {
					const errorMessage =
						error.response.data &&
						error.response.data.error &&
						error.response.data.error.message
							? error.response.data.error.message
							: 'Unknown error'
					throw new ProviderInteractionError(
						`Error while renaming file ${Utils.diskPath(
							folderPath,
							fileName,
						)} (ID: ${fileId}) to ${body.name}: ${errorMessage}`,
					)
				}
			}
		}

		if (body.path) {
			// Don't allow relative paths, let clients do that
			Guards.checkRelativePath(body.path)

			// Get the new folder ID
			const newFolderId = await getFolderWithParents(
				httpClient,
				body.path,
				false,
				true,
			)
			// Move the file by sending a patch request
			try {
				result = await httpClient.patch(`/drive/v2/files/${fileId}`, {
					parents: [{ id: newFolderId }],
				})
				folderPath = body.path
			} catch (error) {
				Logger.error(
					`provider.googledrive.update: error occurred while moving file: fileId: ${fileId}; newParentId: ${newFolderId}; body: ${Utils.json(
						body,
					)}; error: ${Utils.json(error)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else if (error.response.status === 404) {
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file.`,
					)
				} else {
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
						)} (ID: ${fileId}) to ${body.path}: ${errorMessage}`,
					)
				}
			}
		}

		if (body.lastModifiedTime) {
			const modifiedDate = new Date(body.lastModifiedTime).toISOString()
			// Set the lastModifiedTime by sending a patch request
			try {
				result = await httpClient.patch(
					`/drive/v2/files/${fileId}?modifiedDateBehavior=fromBody`,
					{
						modifiedDate,
					},
				)
			} catch (error) {
				Logger.error(
					`provider.googledrive.: error occurred while setting lastModifiedTime: fileId: ${fileId}; body: ${Utils.json(
						body,
					)}; error: ${Utils.json(error)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else if (error.response.status === 404) {
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file.`,
					)
				} else {
					const errorMessage =
						error.response.data &&
						error.response.data.error &&
						error.response.data.error.message
							? error.response.data.error.message
							: 'Unknown error'
					throw new ProviderInteractionError(
						`Error while updating lastModifiedTime for file ${Utils.diskPath(
							folderPath,
							fileName,
						)} (ID: ${fileId}) to '${modifiedDate}': ${errorMessage}`,
					)
				}
			}
		}

		// Now send back the updated file object
		if (result && result.data) {
			const fileObject = result.data
			// If the creation was successful, return a file object
			return {
				code: 200,
				content: convertDriveFileToDabbuResource(
					fileObject,
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
		// Get the folder path from the URL
		const folderPath = Utils.diskPath(parameters.folderPath)
		// Get the file path from the URL
		const { fileName } = parameters

		// Don't allow relative paths, let clients do that
		Guards.checkRelativePath(parameters.folderPath, parameters.fileName)

		if (folderPath && fileName) {
			// If there is a file name provided, delete the file
			const filePath = Utils.diskPath(folderPath, fileName)

			// Get the file ID
			const fileId = await getFileWithParents(httpClient, filePath)

			// Delete the file
			try {
				await httpClient.delete(`/drive/v2/files/${fileId}`)
			} catch (error) {
				Logger.error(
					`provider.googledrive.delete: error occurred while deleting file ${fileId}; error: ${Utils.json(
						error,
					)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else if (error.response.status === 404) {
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file.`,
					)
				} else {
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
						)} (ID: ${fileId}): ${errorMessage}`,
					)
				}
			}

			return {
				code: 204,
			}
		}

		if (folderPath && !fileName) {
			// If there is only a folder name provided, delete the folder
			// Get the folder ID
			const folderId = await getFolderWithParents(
				httpClient,
				folderPath,
			)

			// Delete the folder
			try {
				await httpClient.delete(`/drive/v2/files/${folderId}`)
			} catch (error) {
				Logger.error(
					`provider.googledrive.: error occurred while deleting folder ${folderId}: error: ${Utils.json(
						error,
					)}`,
				)
				if (error.response.status === 401) {
					// If it is a 401, throw an invalid credentials error
					throw new InvalidProviderCredentialsError(
						'Invalid access token',
					)
				} else if (error.response.status === 404) {
					throw new NotFoundError(
						`File ${Utils.diskPath(
							folderPath,
							fileName,
						)} does not exist, could not update file.`,
					)
				} else {
					const errorMessage =
						error.response.data &&
						error.response.data.error &&
						error.response.data.error.message
							? error.response.data.error.message
							: 'Unknown error'
					throw new ProviderInteractionError(
						`Error while deleting folder ${Utils.diskPath(
							folderPath,
						)} (ID: ${folderId}): ${errorMessage}`,
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
