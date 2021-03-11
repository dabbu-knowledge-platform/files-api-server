/* Dabbu Files API Server - server.js
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

// Extended file system library
const fs = require('fs-extra')

// Custom error handler used to send back user and computer friendly messages to clients.
const { errorHandler } = require('./errors.js')
// Logging methods and utils
const { info } = require('./utils.js')

// MARK: Config and Globals

// The prefix to all requests
const rootURL = '/files-api/v1'

// Create an express server
const app = express()

// Initialise the routes
// Provider-related operations
const providerRoutes = require('./routes/provider.js').router
// Internal APIs like cache
const internalRoutes = require('./routes/internal.js').router
// Data related APIs
const dataRoutes = require('./routes/data.js').router

// MARK: Input processing

// Parse the command line arguments and run the server
// The port to run the server on (also check for env variables for port)
let port = process.env.PORT || process.env.port || 8080
// The providers enabled by default (all)
let enabledProviders = [
  'hard_drive',
  'one_drive',
  'google_drive',
  'gmail',
]

// Get the command line args
const args = process.argv.slice(2)
// Check if there are any command line options the user has given
if (args.length > 0) {
  // Check if the port has been mentioned
  if (args[0])
    port = args[0] || process.env.PORT || process.env.port || 8080
  // If there are any more, take them as providers
  if (args.length > 1) enabledProviders = args.slice(1)
}

// MARK: Server

// Tell the server to accept JSON in the HTTP request body
app.use(express.json())

// Add the enabledProviders to the request every time
app.use((req, res, next) => {
  req.enabledProviders = enabledProviders
  next()
})

// Initialise the server on the given port
const server = app.listen(port, () => {
  //info(`Dabbu  Copyright (C) 2021  gamemaker1\n      This program comes with ABSOLUTELY NO WARRANTY.\n      This is free software, and you are welcome to\n      redistribute it under certain conditions; look\n      at the LICENSE file for more details.`)
  // Print out the server version and the port it's running on
  info(`===============================`)
  info(`Dabbu Files API Server v${require('../package.json').version}`)
  info(`Server listening on port ${port}`)
  info(`Enabled providers include ${enabledProviders.join(', ')}`)
})

// Display the port we are running on if they come to /
app.get(`/`, (req, res) =>
  res.send(
    `Dabbu Files API Server v${
      require('../package.json').version
    } running on port ${port}`
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

// When the user presses CTRL+C, gracefully exit
process.on('SIGINT', () => {
  info('SIGINT signal received: closing Dabbu Files API Server')
  // Delete the .cache directory
  fs.remove(`./_dabbu/_server/`) // Delete the .cache directory
    .then(() => info('Removed cache. Exiting..'))
    .then(() => server.close()) // Call close on the server created when we called app.listen
    .then(() => info('Server closed'))
    .finally(() => process.exit(0))
})
