/* Dabbu Files API Server - data.js
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
// Multer, the library used to handle file upload for POST and PUT requests
const multer = require('multer')

// Path library
const path = require('path')

// Custom errors we throw
const {ProviderNotEnabledError} = require('../errors.js')
// Logging methods and utils
const {info, error, json} = require('../utils.js')

// MARK: Config and Globals

// Define the router object, which we will add our routes to
// eslint-disable-next-line new-cap
const router = express.Router()
// Define where multer should store the uploaded files
const upload = multer({dest: path.normalize('./_dabbu/_server/')})

// MARK: Routes

// HTTP GET request to /data/:providerId/:folderPath will list files and folders in that folder
router.get('/:providerId/:folderPath', (request, response, next) => {
	info(
		`(List) Get request called with params: ${json(
			request.params
		)} and queries: ${json(request.query)}`
	)

	// Throw an error if the provider isn't enabled
	if (!request.enabledProviders.includes(request.params.providerId)) {
		throw new ProviderNotEnabledError(
			`The provider ${request.params.providerId} has not been enabled.`
		)
	}

	// Any JS file stored in the src/modules folder is considered a provider.
	const Module = require(`../modules/${request.params.providerId}.js`)
		.default

	// Execute the list function of the provider and return the response or error.
	new Module()
		.list(request.body, request.headers, request.params, request.query) // Pass the request body, headers, URL parameters and query parameters
		.then(response => {
			response.status(200).json({
				code: 200,
				content: response // Send it back with a 200 response code
			})
		})
		.catch(error_ => {
			error(error_)
			next(error_) // Forward the error to our error handler
		})
})

// HTTP GET request to /data/:providerId/:folderPath/:fileName will return the file
router.get('/:providerId/:folderPath/:fileName', (request, response, next) => {
	info(
		`(Read) Get request called with params: ${json(
			request.params
		)} and queries: ${json(request.query)}`
	)

	// Throw an error if the provider isn't enabled
	if (!request.enabledProviders.includes(request.params.providerId)) {
		throw new ProviderNotEnabledError(
			`The provider ${request.params.providerId} has not been enabled.`
		)
	}

	// Any JS file stored in the src/modules folder is considered a provider.
	const Module = require(`../modules/${request.params.providerId}.js`)
		.default

	// Execute the read function of the provider and return the response or error.
	new Module()
		.read(request.body, request.headers, request.params, request.query)
		.then(response => {
			response.status(200).json({
				code: 200,
				content: response // Send it back with a 200 response code
			})
		})
		.catch(error_ => {
			error(error_)
			next(error_) // Forward the error to our error handler
		})
})

// Create a file
router.post(
	'/:providerId/:folderPath/:fileName',
	upload.single('content'),
	(request, response, next) => {
		info(
			`(Create) Post request called with params: ${json(
				request.params
			)} and queries: ${json(request.query)}`
		)

		// Throw an error if the provider isn't enabled
		if (!request.enabledProviders.includes(request.params.providerId)) {
			throw new ProviderNotEnabledError(
				`The provider ${request.params.providerId} has not been enabled.`
			)
		}

		// Any JS file stored in the src/modules folder is considered a provider.
		const Module = require(`../modules/${request.params.providerId}.js`)
			.default

		// Execute the create function of the provider and return the response or error.
		new Module()
			.create(request.body, request.headers, request.params, request.query, request.file)
			.then(response => {
				response.status(201).json({
					code: 201,
					content: response // Send it back with a 200 response code
				})
			})
			.catch(error_ => {
				error(error_)
				next(error_) // Forward the error to our error handler
			})
	}
)

// Update a file
router.put(
	'/:providerId/:folderPath/:fileName',
	upload.single('content'),
	(request, response, next) => {
		info(
			`(Update) Put request called with params: ${json(
				request.params
			)} and queries: ${json(request.query)}`
		)

		// Throw an error if the provider isn't enabled
		if (!request.enabledProviders.includes(request.params.providerId)) {
			throw new ProviderNotEnabledError(
				`The provider ${request.params.providerId} has not been enabled.`
			)
		}

		// Any JS file stored in the src/modules folder is considered a provider.
		const Module = require(`../modules/${request.params.providerId}.js`)
			.default

		// Execute the update function of the provider and return the response or error.
		new Module()
			.update(request.body, request.headers, request.params, request.query, request.file)
			.then(response => {
				response.status(200).json({
					code: 200,
					content: response // Send it back with a 200 response code
				})
			})
			.catch(error_ => {
				error(error_)
				next(error_) // Forward the error to our error handler
			})
	}
)

// Delete a file/folder
router.delete(
	'/:providerId/:folderPath/:fileName?',
	(request, response, next) => {
		info(
			`(Delete) Delete request called with params: ${json(
				request.params
			)} and queries: ${json(request.query)}`
		)

		// Throw an error if the provider isn't enabled
		if (!request.enabledProviders.includes(request.params.providerId)) {
			throw new ProviderNotEnabledError(
				`The provider ${request.params.providerId} has not been enabled.`
			)
		}

		// Any JS file stored in the src/modules folder is considered a provider.
		const Module = require(`../modules/${request.params.providerId}.js`)
			.default

		// Execute the delete function of the provider and return the response or error.
		new Module()
			.delete(request.body, request.headers, request.params, request.query)
			.then(response => {
				response.sendStatus(204) // Send back a 200 response code
			})
			.catch(error_ => {
				error(error_)
				next(error_) // Forward the error to our error handler
			})
	}
)

// MARK: Exports

exports.router = router
