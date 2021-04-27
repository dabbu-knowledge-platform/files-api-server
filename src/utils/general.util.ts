// Define a few utility functions

// Import the path library
import Path from 'path'
import { BadRequestError, UnauthorizedError } from './errors.util'

// Format a date object to RFC3339 format
export function formatDate(date: Date): string {
	function pad(n: number) {
		return n < 10 ? '0' + n : n
	}
	return (
		date.getUTCFullYear() +
		'-' +
		pad(date.getUTCMonth() + 1) +
		'-' +
		pad(date.getUTCDate()) +
		'T' +
		pad(date.getUTCHours()) +
		':' +
		pad(date.getUTCMinutes()) +
		':' +
		pad(date.getUTCSeconds()) +
		'Z'
	)
}

// Get a platform-independent path
export function diskPath(...folders: Array<string>): string {
	return Path.normalize(folders.join('/'))
}

// Check if the request headers contain an Authorization header. If not, throw
// a 403 Unauthorized error
export function checkAccessToken(
	headers: Record<string, string | number>,
): void {
	if (!headers['Authorization'] && !headers['authorization']) {
		throw new UnauthorizedError(
			'Missing access token in `Authorization` header',
		)
	}
}

// Check if any path is relative
export function checkRelativePath(...paths: Array<string>): void {
	for (const path of paths) {
		if (path && (path.includes('/..') || path.includes('/.'))) {
			throw new BadRequestError('Relative paths are not allowed')
		}
	}
}

// Sort out an array of Dabbu resources returned by the API
export function sortDabbuResources(
	files: Array<DabbuResource>,
	options: DabbuListRequestOptions,
): Array<DabbuResource> {
	// Create a new array in which to store the filtered and sorted array
	let sortedFiles = files

	// Check if we have to compare something
	if (options.compareWith && options.value && options.operator) {
		sortedFiles = sortedFiles.filter((file) => {
			// Cast the options.value and field appropriately
			let autoCastField: string | number | Date =
				file[options.compareWith!]
			let autoCastValue: string | number | Date = options.value!

			// If it is a name or kind, let it compare lexographically if the options.operator
			// is < or >
			// For path, convert it to length of the path
			if (
				options.compareWith === 'path' &&
				typeof options.value === 'string'
			) {
				autoCastField = file[options.compareWith].split('/').length
				autoCastValue = options.value.split('/').length
			}

			// For mime type, ideally should check only for equality, but leaving it
			// to lexographically sorted if the options.operator is > or <
			// For size, make both numbers
			if (options.compareWith === 'size') {
				// Using parseInt as file size will ideally return integers and not floats
				autoCastField = Number(file[options.compareWith])
				autoCastValue = Number(options.value)
			}

			// Cast to date if it is createdAtTime or lastModifiedTime
			if (
				options.compareWith === 'createdAtTime' ||
				options.compareWith === 'lastModifiedTime'
			) {
				autoCastField = new Date(file[options.compareWith!])
				autoCastValue = new Date(options.value!)
			}
			// For contentURI, ideally it should never be compared, but leaving it
			// to nodejs sorting (lexographic)

			// Compare the corresponding field's options.value with the now
			// automatically cast options.value based on the options.operator
			switch (options.operator) {
				case '<':
					return autoCastField < autoCastValue
				case '>':
					return autoCastField > autoCastValue
				case '=':
					return autoCastField === autoCastValue
			}
		})
	}

	// Sort it
	if (options.orderBy && options.direction) {
		sortedFiles = sortedFiles.sort((file1, file2) => {
			// Sort it differently for different fields
			switch (options.orderBy) {
				case 'name':
				case 'kind':
				case 'contentUri':
				case 'mimeType':
				case 'provider':
					// If it is a name or kind, compare it lexographically
					// Use the same for mimeType, providerId and contentURI, even
					// though they are fields that shouldn't be used to order
					return options.direction === 'desc'
						? file2[options.orderBy].localeCompare(
								file1[options.orderBy],
						  )
						: file1[options.orderBy].localeCompare(
								file2[options.orderBy],
						  )
				case 'path':
					// For path, convert it to length of the path
					return options.direction === 'desc'
						? file1[options.orderBy].split('/').length >
						  file2[options.orderBy].split('/').length
							? -1
							: 1
						: file2[options.orderBy].split('/').length >
						  file1[options.orderBy].split('/').length
						? -1
						: 1
				case 'size':
					// For size, make both numbers
					// Use Number() instead of parseInt(), it's faster
					return options.direction === 'desc'
						? Number(file1[options.orderBy]) >
						  Number(file2[options.orderBy])
							? -1
							: 1
						: Number(file2[options.orderBy]) >
						  Number(file1[options.orderBy])
						? -1
						: 1
				case 'createdAtTime':
				case 'lastModifiedTime':
					// Cast to date if it is createdAtTime or lastModifiedTime
					return options.direction === 'desc'
						? new Date(file1[options.orderBy!]) >
						  new Date(file2[options.orderBy!])
							? -1
							: 1
						: new Date(file2[options.orderBy!]) >
						  new Date(file1[options.orderBy!])
						? -1
						: 1
				default:
					// FIXME: This `default` branch should ideally not be needed, the
					// switch-case is exhaustive
					return 0
			}
		})
	}

	// Return the filtered and sorted files
	return sortedFiles
}
