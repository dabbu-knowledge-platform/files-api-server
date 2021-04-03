/* Dabbu Files API Server - hard-drive_test.js
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

// MARK: Imports

// Import the server
const app = require('../../src/app.js')
// Library to run tests
const test = require('ava')
// Filesystem library
const fs = require('fs')
// Library to make network requests
const axios = require('axios').default
// Library to send form-encoded data
const FormData = require('form-data')

// MARK: Environment setup

// Initialise the server before running the tests
test.before(async (t) => {
	// Disable server output
	process.env.DO_NOT_LOG_TO_CONSOLE = true
	// Specify the enabled providers and then create the server
	const server = await app(
		0 /* 0 means it will assign a random port */,
		[
			'hard-drive',
			'google-drive',
			'gmail',
			'one-drive'
		] /* Enable all providers */
	)

	// Get the port the server was assigned to
	const {port} = server.address()
	// The server URL
	t.context.serverUrl = `http://localhost:${port}`
	// The API URL
	t.context.apiUrl = `http://localhost:${port}/files-api/v2`
})

// MARK: Tests

// The actual tests using ava
// `%2F` is actually a `/` (forward slash) that is URL encoded.
test('making a request without base-path should throw an error', async (t) => {
	// List request
	const listError = await t.throwsAsync(
		axios.get(`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder/`)
	)
	t.is(listError?.response?.data?.code, 400)
	t.is(listError?.response?.data?.error?.reason, 'missingParam')

	// Read request
	const getError = await t.throwsAsync(
		axios.get(`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder/some-file`)
	)
	t.is(getError?.response?.data?.code, 400)
	t.is(getError?.response?.data?.error?.reason, 'missingParam')

	// Create request
	const postError = await t.throwsAsync(
		axios.post(
			`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder/some-file`
		)
	)
	t.is(postError?.response?.data?.code, 400)
	t.is(postError?.response?.data?.error?.reason, 'missingParam')

	// Update request
	const putError = await t.throwsAsync(
		axios.put(`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder/some-file`)
	)
	t.is(putError?.response?.data?.code, 400)
	t.is(putError?.response?.data?.error?.reason, 'missingParam')

	// Delete request
	const deleteError = await t.throwsAsync(
		axios.delete(
			`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder/some-file`
		)
	)
	t.is(deleteError?.response?.data?.code, 400)
	t.is(deleteError?.response?.data?.error?.reason, 'missingParam')
})

test('making a request with a relative folder path should throw an error', async (t) => {
	// List request
	const listError = await t.throwsAsync(
		axios.get(`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder%2F../`, {
			data: {
				base-path: '/' // eslint-disable-line camelcase
			}
		})
	)
	t.is(listError?.response?.data?.code, 400)
	t.is(listError?.response?.data?.error?.reason, 'malformedUrl')

	// Read request
	const getError = await t.throwsAsync(
		axios.get(
			`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder%2F../some-file`,
			{
				data: {
					base-path: '/' // eslint-disable-line camelcase
				}
			}
		)
	)
	t.is(getError?.response?.data?.code, 400)
	t.is(getError?.response?.data?.error?.reason, 'malformedUrl')

	// Create request
	const postFormData = new FormData()
	postFormData.append(
		'content',
		fs.createReadStream('tests/test_content/Text.txt')
	)
	postFormData.append('base-path', '/')
	const postError = await t.throwsAsync(
		axios.post(
			`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder%2F../some-file`,
			postFormData,
			{
				headers: postFormData.getHeaders()
			}
		)
	)
	t.is(postError?.response?.data?.code, 400)
	t.is(postError?.response?.data?.error?.reason, 'malformedUrl')

	// Update request
	const putFormData = new FormData()
	putFormData.append(
		'content',
		fs.createReadStream('tests/test_content/Text.txt')
	)
	putFormData.append('base-path', '/')
	const putError = await t.throwsAsync(
		axios.put(
			`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder%2F../some-file`,
			putFormData,
			{
				headers: putFormData.getHeaders()
			}
		)
	)
	t.is(putError?.response?.data?.code, 400)
	t.is(putError?.response?.data?.error?.reason, 'malformedUrl')

	// Delete request
	const deleteError = await t.throwsAsync(
		axios.delete(
			`${t.context.apiUrl}/data/hard-drive/%2Funknown-folder%2F../some-file`,
			{
				data: {
					base-path: '/' // eslint-disable-line camelcase
				}
			}
		)
	)
	t.is(deleteError?.response?.data?.code, 400)
	t.is(deleteError?.response?.data?.error?.reason, 'malformedUrl')
})

test('listing files in a non-existent folder should throw an error', async (t) => {
	const error = await t.throwsAsync(
		axios.get(`${t.context.apiUrl}/data/hard-drive/unknown-folder`, {
			data: {
				base-path: '/' // eslint-disable-line camelcase
			}
		})
	)
	t.is(error?.response?.data?.code, 404)
})

test('fetching a non-existent file should throw an error', async (t) => {
	const error = await t.throwsAsync(
		axios.get(`${t.context.apiUrl}/data/hard-drive/%2F/unknown-file`, {
			data: {
				base-path: '/' // eslint-disable-line camelcase
			}
		})
	)
	t.is(error?.response?.data?.code, 404)
})

// TODO: Add more tests for GET, POST, PUT and DELETE
