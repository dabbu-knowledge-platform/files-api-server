/* Dabbu Files API Server - app.js
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

// Express JS, the library used to run the server and respond to HTTP requests
const express = require('express')

// Custom error handler used to send back user and computer friendly messages to clients.
const {errorHandler} = require('./errors.js')

// MARK: Routes

// Provider-related operations
const providerRoutes = require('./routes/provider.js').router
// Internal APIs like cache
const internalRoutes = require('./routes/internal.js').router
// Data related APIs
const dataRoutes = require('./routes/data.js').router

// MARK: Config and Globals

// The prefix to all requests
const rootURL = '/files-api/v1'

// MARK: Server

// Create an express server and add the required routes and middleware
function createServer(enabledProviders) {
	// Create an express server
	const app = express()

	// Tell the server to accept JSON and Multipart Form Data
	// (x-www-form-urlencoded) in the HTTP request body
	app.use(express.urlencoded({extended: true}))
	app.use(express.json())

	// Add the enabledProviders to the request every time
	app.use((request, response, next) => {
		request.enabledProviders = enabledProviders
		next()
	})

	// Display the port we are running on if they come to /
	app.get('/', (request, response) =>
		response.send(
			`Dabbu Files API Server v${
				require('../package.json').version
			} running on port ${process.env.DABBU_FILES_API_SERVER_PORT}`
		)
	)

	// Route calls about internal apis like cache to the internal route
	app.use(`${rootURL}/internal/`, internalRoutes)

	// Route calls about providers to the provider route
	app.use(`${rootURL}/providers/`, providerRoutes)

	// Route calls about user data to the data route
	app.use(`${rootURL}/data/`, dataRoutes)

	// Use a custom error handler to return user and computer friendly responses
	app.use(errorHandler)

	// Return the created server
	return app
}

// MARK: Exports

// Export a method that listens on the given port with the given providers
module.exports = async (
	// The port to run the server on
	port,
	// The providers enabled
	enabledProviders
) => {
	// If no port is specified, check for environment variables or then 8080
	if (port === null || port === undefined || typeof port !== 'number') {
		port = process.env.PORT || process.env.port || 8080
	}

	// Set the environment variable DABBU_FILES_API_SERVER_PORT
	process.env.DABBU_FILES_API_SERVER_PORT = port
	// If no specific providers are to be enabled, enable all
	if (
		enabledProviders === null ||
    enabledProviders === undefined ||
    enabledProviders.length === 0
	) {
		enabledProviders = [
			'hard_drive',
			'one_drive',
			'google_drive',
			'gmail'
		]
	}

	// Create the server
	const app = createServer(enabledProviders)
	// Return the server instance
	return new Promise((resolve, reject) => {
		resolve(app.listen(port))
	})
}
