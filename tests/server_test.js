/* Dabbu Files API Server - server_test.js
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
const app = require('../src/app.js')
// Library to run tests
const test = require('ava')
// Library to make network requests
const axios = require('axios').default.default

// MARK: Environment setup

// Initialise the server before running the tests
test.before(async t => {
	// Disable server output
	process.env.DO_NOT_LOG_TO_CONSOLE = true
	// Specify the enabled providers and then create the server
	const server = await app(
		0 /* 0 means it will assign a random port */,
		[
			'hard_drive',
			'google_drive',
			'gmail',
			'one_drive'
		] /* Enable all providers */
	)

	// Get the port the server was assigned to
	const {port} = server.address()
	// The server URL
	t.context.serverUrl = `http://localhost:${port}`
	// The API URL
	t.context.apiUrl = `http://localhost:${port}/files-api/v1`
})

// MARK: Tests

// The actual tests using ava

test('list providers', async t => {
	const response = await axios.get(`${t.context.apiUrl}/providers`)
	t.is(response?.data?.code, 200)
	t.deepEqual(response?.data?.content?.providers, [
		'hard_drive',
		'google_drive',
		'gmail',
		'one_drive'
	])
})

test('enabled provider should return an HTTP 200 when queried', async t => {
	const response = await axios.get(
		`${t.context.apiUrl}/providers/hard_drive`
	)
	t.is(response?.status, 200)
})

test('unknown/disabled providers should throw an error', async t => {
	let error = await t.throwsAsync(
		axios.get(`${t.context.apiUrl}/providers/unknown_provider`)
	)
	t.is(error?.response?.status, 501)

	error = await t.throwsAsync(
		axios.get(
			`${t.context.apiUrl}/data/unknown_provider/some-folder/some-file`
		)
	)
	t.is(error?.response?.data?.code, 501)
})
