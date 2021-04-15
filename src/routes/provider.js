/* Dabbu Files API Server - providers.js
 * Copyright (C) 2021 Dabbu Knowledge Platform <dabbuknowledgeplatform@gmail.com>
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

// Logging methods and utils
const { info, json } = require('../utils.js')

// MARK: Config and Globals

// Define the router object, which we will add our routes to
// eslint-disable-next-line new-cap
const router = express.Router()

// MARK: Routes

// HTTP GET request to `/providers` will return all enabled providers
router.get('/', (request, response, next) => {
	info(
		`(List providers) Get request called with params: ${json(
			request.params
		)} and queries: ${json(request.query)}`
	)

	// Send back a successfull response code (200) and the enabled providers.
	response.status(200).json({
		code: 200,
		content: {
			providers: request.enabledProviders // Can be accessed using `response.data.content.providers` if using axios.
		}
	})
})

// HTTP GET request to /providers/:providerId will return status code 200 if the provider is enabled, else 501
router.get('/:providerId', (request, response, next) => {
	info(
		`(Check provider) Get request called with params: ${json(
			request.params
		)} and queries: ${json(request.query)}`
	)

	// Return the response accordingly
	// Throw an error if the provider isn't enabled
	if (request.enabledProviders.includes(request.params.providerId)) {
		response.sendStatus(200) // Enabled
	} else {
		response.sendStatus(501) // Not enabled
	}
})

// MARK: Exports

exports.router = router
