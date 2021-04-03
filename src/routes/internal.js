/* Dabbu Files API Server - internal.js
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

/* eslint promise/prefer-await-to-then: 0 */

// MARK: Imports

// Express JS, the library used to run the server and respond to HTTP requests
const express = require('express')

// Custom errors we throw
const { BadRequestError } = require('../errors.js')
// Logging methods and utils
const { info, json } = require('../utils.js')

// MARK: Config and Globals

// Define the router object, which we will add our routes to
// eslint-disable-next-line new-cap
const router = express.Router()

// MARK: Routes

// Retrieve a file/folder from cache
router.get('/cache/:filePath', (request, response, next) => {
	info(
		`(Cache) Get request called with params: ${json(
			request.params
		)} and queries: ${json(request.query)}`
	)

	// Don't allow relative paths, else they will be able to access the rest of the file system
	if (request.params.filePath.includes('/..')) {
		throw new BadRequestError('File paths must not contain relative paths')
	}

	// Stream the file back
	response.download(`./_dabbu/_server/${request.params.filePath}`)
})

// MARK: Exports

exports.router = router
