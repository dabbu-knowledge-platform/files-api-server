/* Dabbu Files API Server - errors.js
 * Copyright (C) 2021	gamemaker1
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.	See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.	If not, see <https://www.gnu.org/licenses/>.
 */

// MARK: Errors

// The superclass for custom errors that Dabbu Files API Server can throw
exports.GeneralError = class GeneralError extends Error {
	// It must have an HTTP response code, a user-friendly message and a computer-friendly reason
	constructor(code, message, reason) {
		super()
		this.code = code
		this.message = message
		this.reason = reason
	}
}

// Bad request; returned if the URL has any typos or mistakes
exports.BadRequestError = class BadRequestError extends (
	this.GeneralError
) {
	constructor(message) {
		super(400, message, 'malformedUrl')
	}
}
// Missing provider specific variable in the request body; but returns a 400 Malformed URL code
exports.MissingParamError = class MissingParameterError extends (
	this.GeneralError
) {
	constructor(message) {
		super(400, message, 'missingParam')
	}
}
// Missing access token in the request header
exports.UnauthorizedError = class UnauthorizedError extends (
	this.GeneralError
) {
	constructor(message) {
		super(401, message, 'unauthorized')
	}
}
// 404 not found
exports.NotFoundError = class NotFoundError extends this.GeneralError {
	constructor(message) {
		super(404, message, 'notFound')
	}
}
// Not implemented; used when a certain request verb like PUT (update) is not supported by a provider
exports.NotImplementedError = class NotImplementedError extends (
	this.GeneralError
) {
	constructor(message) {
		super(501, message, 'notImplemented')
	}
}
// Conflict; used when a file already exists and you try to create it instead of update it
exports.FileExistsError = class FileExistsError extends (
	this.GeneralError
) {
	constructor(message) {
		super(409, message, 'conflict')
	}
}
// Service unavailable; used when the provider is not enabled in the config file
exports.ProviderNotEnabledError = class ProviderNotEnabledError extends (
	this.GeneralError
) {
	constructor(message) {
		super(501, message, 'providerNotEnabled')
	}
}

// MARK: Error handler

// The custom error handler we use on the server
exports.errorHandler = (error, request, response, next) => {
	if (error instanceof this.GeneralError) {
		// If it is a custom error, return the code, message and reason accordingly
		return response.status(error.code).json({
			code: error.code,
			error: {
				message: error.message,
				reason: error.reason
			}
		})
	}

	if (error.code && typeof error.code === 'number') {
		// If there is a valid numerical code to the error, return it with the code, message and "unknownReason"
		console.error(error)
		return response.status(error.code).json({
			code: error.code,
			error: {
				message: error.message,
				reason: 'unknownReason'
			}
		})
	}

	if (error.isAxiosError) {
		console.error(error.response.data)
		// If it's an axios error, return the status code and the error
		const errorMessage =
				error.response.data &&
				error.response.data.error &&
				error.response.data.error.message ?
					error.response.data.error.message :
					'Unknown error'
		const errorReason =
				error.response.data &&
				error.response.data.error &&
				error.response.data.error.reason ?
					error.response.data.error.reason :
					error.response.data.error.code || 'unknownReason'
		console.error(
			`${error.response.status} (${error.response.statusText}): ${errorMessage}`
		)
		return response.status(error.response.status).json({
			code: error.response.status,
			error: {
				message: errorMessage,
				reason: errorReason
			}
		})
	}

	console.error(error)
	// Else return an internalServerError
	return response.status(500).json({
		code: 500,
		error: {
			message: error.message,
			reason: 'internalServerError'
		}
	})
}
