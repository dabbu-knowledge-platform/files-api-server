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

// MARK: Imports

// Express JS, the library used to run the server and respond to HTTP requests
const express = require('express')
// Multer, the library used to handle file upload for POST and PUT requests
const multer = require('multer')

// Path library
const path = require('path')

// Custom errors we throw
const { ProviderNotEnabledError } = require('../errors.js')
// Logging methods and utils
const { info, error, json } = require('../utils.js')

// MARK: Config and Globals

// Define the router object, which we will add our routes to
const router = express.Router()
// Define where multer should store the uploaded files
const upload = multer({ dest: path.normalize(`./.cache/_server/`) })

// MARK: Routes

// HTTP GET request to /data/:providerId/:folderPath will list files and folders in that folder
router.get(`/:providerId/:folderPath`, (req, res, next) => {
  info(
    `(List) Get request called with params: ${json(
      req.params
    )} and queries: ${json(req.query)}`
  )

  // Throw an error if the provider isn't enabled
  if (req.enabledProviders.indexOf(req.params.providerId) === -1) {
    throw new ProviderNotEnabledError(
      `The provider ${req.params.providerId} has not been enabled.`
    )
  }

  // Any JS file stored in the src/modules folder is considered a provider.
  const Module = require(`../modules/${req.params.providerId}.js`)
    .default

  // Execute the list function of the provider and return the response or error.
  new Module()
    .list(req.body, req.headers, req.params, req.query) // Pass the request body, headers, URL parameters and query parameters
    .then((result) => {
      res.status(200).json({
        code: 200,
        content: result, // Send it back with a 200 response code
      })
    })
    .catch((err) => {
      error(err)
      next(err) // Forward the error to our error handler
    })
})

// HTTP GET request to /data/:providerId/:folderPath/:fileName will return the file
router.get(`/:providerId/:folderPath/:fileName`, (req, res, next) => {
  info(
    `(Read) Get request called with params: ${json(
      req.params
    )} and queries: ${json(req.query)}`
  )

  // Throw an error if the provider isn't enabled
  if (req.enabledProviders.indexOf(req.params.providerId) === -1) {
    throw new ProviderNotEnabledError(
      `The provider ${req.params.providerId} has not been enabled.`
    )
  }

  // Any JS file stored in the src/modules folder is considered a provider.
  const Module = require(`../modules/${req.params.providerId}.js`)
    .default

  // Execute the read function of the provider and return the response or error.
  new Module()
    .read(req.body, req.headers, req.params, req.query)
    .then((result) => {
      res.status(200).json({
        code: 200,
        content: result, // Send it back with a 200 response code
      })
    })
    .catch((err) => {
      error(err)
      next(err) // Forward the error to our error handler
    })
})

// Create a file
router.post(
  `/:providerId/:folderPath/:fileName`,
  upload.single('content'),
  (req, res, next) => {
    info(
      `(Create) Post request called with params: ${json(
        req.params
      )} and queries: ${json(req.query)}`
    )

    // Throw an error if the provider isn't enabled
    if (req.enabledProviders.indexOf(req.params.providerId) === -1) {
      throw new ProviderNotEnabledError(
        `The provider ${req.params.providerId} has not been enabled.`
      )
    }

    // Any JS file stored in the src/modules folder is considered a provider.
    const Module = require(`../modules/${req.params.providerId}.js`)
      .default

    // Execute the create function of the provider and return the response or error.
    new Module()
      .create(req.body, req.headers, req.params, req.query, req.file)
      .then((result) => {
        res.status(201).json({
          code: 201,
          content: result, // Send it back with a 200 response code
        })
      })
      .catch((err) => {
        error(err)
        next(err) // Forward the error to our error handler
      })
  }
)

// Update a file
router.put(
  `/:providerId/:folderPath/:fileName`,
  upload.single('content'),
  (req, res, next) => {
    info(
      `(Update) Put request called with params: ${json(
        req.params
      )} and queries: ${json(req.query)}`
    )

    // Throw an error if the provider isn't enabled
    if (req.enabledProviders.indexOf(req.params.providerId) === -1) {
      throw new ProviderNotEnabledError(
        `The provider ${req.params.providerId} has not been enabled.`
      )
    }

    // Any JS file stored in the src/modules folder is considered a provider.
    const Module = require(`../modules/${req.params.providerId}.js`)
      .default

    // Execute the update function of the provider and return the response or error.
    new Module()
      .update(req.body, req.headers, req.params, req.query, req.file)
      .then((result) => {
        res.status(200).json({
          code: 200,
          content: result, // Send it back with a 200 response code
        })
      })
      .catch((err) => {
        error(err)
        next(err) // Forward the error to our error handler
      })
  }
)

// Delete a file/folder
router.delete(
  `/:providerId/:folderPath/:fileName?`,
  (req, res, next) => {
    info(
      `(Delete) Delete request called with params: ${json(
        req.params
      )} and queries: ${json(req.query)}`
    )

    // Throw an error if the provider isn't enabled
    if (req.enabledProviders.indexOf(req.params.providerId) === -1) {
      throw new ProviderNotEnabledError(
        `The provider ${req.params.providerId} has not been enabled.`
      )
    }

    // Any JS file stored in the src/modules folder is considered a provider.
    const Module = require(`../modules/${req.params.providerId}.js`)
      .default

    // Execute the delete function of the provider and return the response or error.
    new Module()
      .delete(req.body, req.headers, req.params, req.query)
      .then((result) => {
        res.sendStatus(204) // Send back a 200 response code
      })
      .catch((err) => {
        error(err)
        next(err) // Forward the error to our error handler
      })
  }
)

// MARK: Exports

exports.router = router
