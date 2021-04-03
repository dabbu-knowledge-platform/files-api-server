/* Dabbu Files API Server - one-drive-test.js
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
		['one-drive'] /* Enable only one-drive */
	)

	// Get the port the server was assigned to
	const {port} = server.address()
	// The server URL
	t.context.serverUrl = `http://localhost:${port}`
	// The API URL
	t.context.apiUrl = `http://localhost:${port}/files-api/v2`

	// TODO: Get access token
})

// MARK: Tests

// The actual tests using ava
// `%2F` is actually a `/` (forward slash) that is URL encoded.

test('making a request without authorization header should throw an error', async (t) => {
	// List request
	const listError = await t.throwsAsync(
		axios.get(`${t.context.apiUrl}/data/one-drive/%2Funknown-folder/`)
	)
	t.is(listError?.response?.data?.code, 401)
	t.is(listError?.response?.data?.error?.reason, 'unauthorized')

	// Read request
	const getError = await t.throwsAsync(
		axios.get(`${t.context.apiUrl}/data/one-drive/%2Funknown-folder/some-file`)
	)
	t.is(getError?.response?.data?.code, 401)
	t.is(getError?.response?.data?.error?.reason, 'unauthorized')

	// Create request
	const postError = await t.throwsAsync(
		axios.post(`${t.context.apiUrl}/data/one-drive/%2Funknown-folder/some-file`)
	)
	t.is(postError?.response?.data?.code, 401)
	t.is(postError?.response?.data?.error?.reason, 'unauthorized')

	// Update request
	const putError = await t.throwsAsync(
		axios.put(`${t.context.apiUrl}/data/one-drive/%2Funknown-folder/some-file`)
	)
	t.is(putError?.response?.data?.code, 401)
	t.is(putError?.response?.data?.error?.reason, 'unauthorized')

	// Delete request
	const deleteError = await t.throwsAsync(
		axios.delete(
			`${t.context.apiUrl}/data/one-drive/%2Funknown-folder/some-file`
		)
	)
	t.is(deleteError?.response?.data?.code, 401)
	t.is(deleteError?.response?.data?.error?.reason, 'unauthorized')
})

// TODO: Add more tests for LIST, GET, POST, PUT and DELETE
