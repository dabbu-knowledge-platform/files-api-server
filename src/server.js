/* Dabbu Server - a unified API to retrieve your files and folders stored online
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
const express = require("express")
// Multer, the library used to handle file upload for POST and PUT requests
const multer = require("multer")
// Path library
const path = require("path")

// Custom error handler used to send back user and computer friendly messages to clients.
const { ProviderNotEnabledError, errorHandler } = require("./errors.js")
// Logging methods and utils
const { info, debug, error, json } = require("./utils.js")

// MARK - Config and Globals

// Import the configuration from the dabbu_config file in src/config
const config = require("./config/dabbu_config.json")
// The port to run the server on
const port = config.runtime.port
// The prefix to all requests
const rootURL = "/dabbu/v1/api"

// Create an express server
const app = express()
// Define where multer should store the uploaded files
const upload = multer({ dest: path.normalize(`${__dirname}/../uploads/`) })

// A dictionary of all the provider code, can be accessed using the provider's ID
const providerClasses = {}

// MARK: Server

// Tell the server to accept JSON in the HTTP request body
app.use(express.json())

// Initialise the server on the given port
app.listen(port, () => {
  //info(`Dabbu  Copyright (C) 2021  gamemaker1\n      This program comes with ABSOLUTELY NO WARRANTY.\n      This is free software, and you are welcome to\n      redistribute it under certain conditions; look\n      at the LICENSE file for more details.`)
  // Print out the server version and the port it's running on
  info(`===============================`)
  info(`Dabbu Server v1.0.0`)
  info(`Server listening on port ${port}`)
  // Loop through the enabled providers listed in the config file
  for (var i = 0, length = config.providers.length; i < length; i++) {
    // Get the ID from the array
    const providerId = config.providers[i]
    // Any JS file stored in the src/modules folder is considered a provider.
    const Module = require(`./modules/${providerId}.js`).default
    // Store the provider class against its ID in the providerClasses global variable
    providerClasses[providerId] = new Module()
  }
})

// HTTP GET request to `/` will return text
app.get(`/`, (req, res, next) => {
  debug(`(Root) Get request called with params: ${json(req.params)} and queries: ${json(req.query)}`)

  // Send back a successfull response.
  res.status(200).send(`Dabbu Server running on port ${port}`)
})

// HTTP GET request to `/providers` will return all enabled providers
app.get(`${rootURL}/providers`, (req, res, next) => {
  debug(`(List providers) Get request called with params: ${json(req.params)} and queries: ${json(req.query)}`)
  
  // Send back a successfull response code (200) and the enabled providers.
  res.status(200).json({
    code: 200,
    content: {
      providers: config.providers // Can be accessed using `response.data.content.providers` if using axios.
    }
  })
})

// HTTP GET request to /providers/:providerId will return status code 200 if the provider is enabled, else 503
app.get(`${rootURL}/providers/:providerId`, (req, res, next) => {
  debug(`(Check provider) Get request called with params: ${json(req.params)} and queries: ${json(req.query)}`)
  
  // Return the response accordingly
  // Throw an error if the provider isn't enabled
  if (!providerClasses[req.params.providerId]) {
    res
      .sendStatus(503) // Not enabled
  } else {
    res
      .sendStatus(200) // Enabled
  }
})

// HTTP GET request to /data/:providerId/:folderPath will list files and folders in that folder
app.get(`${rootURL}/data/:providerId/:folderPath`, (req, res, next) => {
  debug(`(List) Get request called with params: ${json(req.params)} and queries: ${json(req.query)}`)
  
  // Throw an error if the provider isn't enabled
  if (!providerClasses[req.params.providerId]) {
    throw new ProviderNotEnabledError(`The provider ${req.params.providerId} has not been enabled.`)
  }

  // Execute the list function of the provider and return the response or error.
  providerClasses[req.params.providerId]
    .list(req.body, req.headers, req.params, req.query) // Pass the request body, headers, URL parameters and query parameters
    .then(result => {
      res
        .status(200)
        .json({
          code: 200,
          content: result // Send it back with a 200 response code
        })
    })
    .catch(err => {
      error(err)
      next(err) // Forward the error to our error handler
    })
})

// HTTP GET request to /data/:providerId/:folderPath/:fileName will return the file
app.get(`${rootURL}/data/:providerId/:folderPath/:fileName`, (req, res, next) => {
  debug(`(Read) Get request called with params: ${json(req.params)} and queries: ${json(req.query)}`)

  // Throw an error if the provider isn't enabled
  if (!providerClasses[req.params.providerId]) {
    throw new ProviderNotEnabledError(`The provider ${req.params.providerId} has not been enabled.`)
  }

  // Execute the read function of the provider and return the response or error.
  providerClasses[req.params.providerId]
    .read(req.body, req.headers, req.params, req.query)
    .then(result => {
      res
        .status(200)
        .json({
          code: 200,
          content: result // Send it back with a 200 response code
        })
    })
    .catch(err => {
      error(err)
      next(err) // Forward the error to our error handler
    })
})

// Create a file
app.post(`${rootURL}/data/:providerId/:folderPath/:fileName`, upload.single("content"), (req, res, next) => {
  debug(`(Create) Post request called with params: ${json(req.params)} and queries: ${json(req.query)}`)
  
  // Throw an error if the provider isn't enabled
  if (!providerClasses[req.params.providerId]) {
    throw new ProviderNotEnabledError(`The provider ${req.params.providerId} has not been enabled.`)
  }

  // Execute the create function of the provider and return the response or error.
  providerClasses[req.params.providerId]
    .create(req.body, req.headers, req.params, req.query, req.file)
    .then(result => {
      res
        .sendStatus(200) // Send back a 200 response code
    })
    .catch(err => {
      error(err)
      next(err) // Forward the error to our error handler
    })
})

// Update a file
app.put(`${rootURL}/data/:providerId/:folderPath/:fileName`, upload.single("content"), (req, res, next) => {
  debug(`(Update) Put request called with params: ${json(req.params)} and queries: ${json(req.query)}`)
  
  // Throw an error if the provider isn't enabled
  if (!providerClasses[req.params.providerId]) {
    throw new ProviderNotEnabledError(`The provider ${req.params.providerId} has not been enabled.`)
  }

  // Execute the update function of the provider and return the response or error.
  providerClasses[req.params.providerId]
    .update(req.body, req.headers, req.params, req.query, req.file)
    .then(result => {
      res
        .sendStatus(200) // Send back a 200 response code
    })
    .catch(err => {
      error(err)
      next(err) // Forward the error to our error handler
    })
})

// Delete a file/folder
app.delete(`${rootURL}/data/:providerId/:folderPath/:fileName?`, (req, res, next) => {
  debug(`(Delete) Delete request called with params: ${json(req.params)} and queries: ${json(req.query)}`)
  
  // Throw an error if the provider isn't enabled
  if (!providerClasses[req.params.providerId]) {
    throw new ProviderNotEnabledError(`The provider ${req.params.providerId} has not been enabled.`)
  }

  // Execute the delete function of the provider and return the response or error.
  providerClasses[req.params.providerId]
    .delete(req.body, req.headers, req.params, req.query)
    .then(result => {
      res
        .sendStatus(200) // Send back a 200 response code
    })
    .catch(err => {
      error(err)
      next(err) // Forward the error to our error handler
    })
})

// Use a custom error handler to return user and computer friendly responses
app.use(errorHandler)
