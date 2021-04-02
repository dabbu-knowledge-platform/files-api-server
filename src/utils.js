/* Dabbu Files API Server - utils.js
 * Copyright (C) 2021  gamemaker1
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// MARK: Imports for all functions

// Files library, used to do all file operations across platforms
const fs = require('fs-extra')

// Custom errors we throw
const {BadRequestError} = require('./errors.js')

// MARK: Functions

// Print out an informational message
exports.info = (message) => {
	const date = new Date().toISOString()
	if (!process.env.DO_NOT_LOG_TO_CONSOLE) {
		console.log(` INFO  | ${date} | ${message}`)
	}

	const stream = fs.createWriteStream('./_dabbu/files_api_server.log', {
		flags: 'a'
	})
	stream.write(`INFO  | ${date} | ${message}\n`)
	stream.end()
}

// Print out a provider log
exports.debug = (provider, message) => {
	if (process.env.debug || process.env.DEBUG) {
		const date = new Date().toISOString()
		if (!process.env.DO_NOT_LOG_TO_CONSOLE) {
			console.log(` DEBUG  | ${date} | ${provider} | ${message}`)
		}

		const stream = fs.createWriteStream('./_dabbu/files_api_server.log', {
			flags: 'a'
		})
		stream.write(`DEBUG  | ${date} | ${provider} | ${message}\n`)
		stream.end()
	}
}

// Print out an error
exports.error = (error) => {
	const date = new Date().toISOString()
	if (!process.env.DO_NOT_LOG_TO_CONSOLE) {
		console.log(` ERROR | ${date} | ${this.json(error, true)}`)
	}

	const stream = fs.createWriteStream('./_dabbu/files_api_server.log', {
		flags: 'a'
	})
	stream.write(`ERROR | ${date} | ${this.json(error)}\n`)
	stream.write('\n')
	stream.end()
}

// Format JSON
exports.json = (string, decorate = false) => {
	if (decorate) {
		return JSON.stringify(string, null, 4)
	}

	return JSON.stringify(string)
}

// Get a platform-independent path
const path = require('path')
exports.diskPath = (...folders) => {
	return path.normalize(folders.join('/'))
}

// Sort out an array of files returned by the API
exports.sortFiles = (
	compareWith,
	operator,
	value,
	orderBy,
	direction,
	files
) => {
	// Check if the values provided are valid
	// All possible valid values for each field
	const possibleFields = new Set([
		'name',
		'kind',
		'path',
		'mimeType',
		'size',
		'createdAtTime',
		'lastModifiedTime',
		'contentURI'
	])
	const possibleOps = ['<', '>', '=']
	const possibleDirs = ['asc', 'desc']

	if (compareWith && !possibleFields.has(compareWith)) {
		throw new BadRequestError(
			`Field ${compareWith} is not a valid field to compare`
		)
	}

	if (operator && !possibleOps.includes(operator)) {
		throw new BadRequestError(`Operator ${operator} is not a valid operator`)
	}

	if (orderBy && !possibleFields.has(orderBy)) {
		throw new BadRequestError(
			`Field ${orderBy} is not a valid field to order by`
		)
	}

	if (direction && !possibleDirs.includes(direction)) {
		throw new BadRequestError(`Direction ${direction} is not a valid direction`)
	}

	// Create a new array in which to store the filtered and sorted array
	let sortedFiles = files

	// Check if we have to compare something
	if (compareWith) {
		if (value && operator) {
			sortedFiles = sortedFiles.filter((file) => {
				// Cast the value and field appropriately
				let autoCastField = file[compareWith]
				let autoCastValue = value

				// If it is a name or kind, let it compare lexographically if the operator
				// is < or >
				// For path, convert it to length of the path
				if (compareWith === 'path') {
					autoCastField = this.diskPath(file[compareWith].split('/')).split('/')
						.length
					autoCastValue = this.diskPath(value.split('/')).split('/').length
				}

				// For mime type, ideally should check only for equality, but leaving it
				// to lexographically sorted if the operator is > or <
				// For size, make both numbers
				if (compareWith === 'size') {
					// Using parseInt as file size will ideally return integers and not floats
					autoCastField = Number(file[compareWith])
					autoCastValue = Number(value)
				}

				// Cast to date if it is createdAtTime or lastModifiedTime
				if (compareWith.endsWith('Time')) {
					autoCastField = new Date(file[compareWith])
					autoCastValue = new Date(value)
				}
				// For contentURI, ideally it should never be compared, but leaving it
				// to nodejs sorting (lexographic)

				// Compare the corresponding field's value with the now
				// automatically cast value based on the operator
				if (operator === '<') {
					return autoCastField < autoCastValue
				}

				if (operator === '>') {
					return autoCastField > autoCastValue
				}

				if (operator === '=') {
					return autoCastField === autoCastValue
				}

				return undefined
			})
		} else {
			throw new BadRequestError(
				`Found field ${compareWith} to compare, but did not receive operator or value`
			)
		}
	}

	// Sort it
	if (orderBy && direction) {
		sortedFiles = sortedFiles.sort((file1, file2) => {
			// Sort it differently for different fields
			// If it is a name or kind, compare it lexographically
			// Use the same for mimeType and contentURI, even
			// though they are fields that shouldn't be used to order
			if (orderBy === 'name' || orderBy === 'kind' || orderBy === 'mimeType') {
				return direction === 'desc'
					? file1[orderBy].localeCompare(file2[orderBy])
					: file2[orderBy].localeCompare(file1[orderBy])
			}

			if (orderBy === 'path') {
				// For path, convert it to length of the path
				return direction === 'desc'
					? this.diskPath(file1[orderBy].split('/')).split('/').length >
					  this.diskPath(file2[orderBy].split('/')).split('/').length
						? -1
						: 1
					: this.diskPath(file2[orderBy].split('/')).split('/').length >
					  this.diskPath(file1[orderBy].split('/')).split('/').length
					? -1
					: 1
			}

			if (orderBy === 'size') {
				// For size, make both numbers
				// Use Number() instead of parseInt(), it's faster
				return direction === 'desc'
					? Number(file1[orderBy]) > Number(file2[orderBy])
						? -1
						: 1
					: Number(file2[orderBy]) > Number(file1[orderBy])
					? -1
					: 1
			}

			if (orderBy.endsWith('Time')) {
				// Cast to date if it is createdAtTime or lastModifiedTime
				return direction === 'desc'
					? new Date(file1[orderBy]) > new Date(file2[orderBy])
						? -1
						: 1
					: new Date(file2[orderBy]) > new Date(file1[orderBy])
					? -1
					: 1
			}

			return undefined
		})
	}

	// Return the filtered and sorted files
	return sortedFiles
}

exports.cachePath = (filePath) => {
	return `http://localhost:${
		process.argv.DABBU_FILES_API_SERVER_PORT || 8080
	}/files-api/v1/internal/cache/${encodeURIComponent(filePath)}`
}
