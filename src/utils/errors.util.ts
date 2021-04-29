// The error handler and all errors thrown intentionally are defined here

// Use express to handle HTTP requests
import * as Express from 'express'
import { isDabbuError, isAxiosError } from './guards.util'

// The superclass for custom errors that Dabbu Files API Server can throw
export class DabbuError extends Error {
	// It must have an HTTP response code, a user-friendly message and a
	// computer-friendly reason
	code: number
	message: string
	reason: string
	isDabbuError: true

	constructor(code: number, message: string, reason: string) {
		super()
		this.code = code
		this.message = message
		this.reason = reason
		this.isDabbuError = true
	}
}

// Bad request; returned if the URL has any typos or mistakes
export class BadRequestError extends DabbuError {
	constructor(message: string) {
		super(400, message, 'malformedUrl')
	}
}
// Missing provider specific variable in the request body; but returns a 400
// bad request code
export class MissingParameterError extends DabbuError {
	constructor(message: string) {
		super(400, message, 'missingParam')
	}
}
// Invalid access token in the request header
export class InvalidCredentialsError extends DabbuError {
	constructor(message: string) {
		super(401, message, 'invalidCredentials')
	}
}
// Missing access token in the request header
export class UnauthorizedError extends DabbuError {
	constructor(message: string) {
		super(403, message, 'unauthorized')
	}
}
// 404 not found
export class NotFoundError extends DabbuError {
	constructor(message: string) {
		super(404, message, 'notFound')
	}
}
// Conflict; used when a file already exists and you try to create it instead
// of update it
export class FileExistsError extends DabbuError {
	constructor(message: string) {
		super(409, message, 'conflict')
	}
}
// Not implemented; used when a certain request verb like POST (create) is not
// supported by a provider
export class NotImplementedError extends DabbuError {
	constructor(message: string) {
		super(501, message, 'notImplemented')
	}
}
// Service unavailable; used when the provider is invalid or not enabled
export class InvalidProviderError extends DabbuError {
	constructor(message: string) {
		super(501, message, 'invalidProvider')
	}
}
// An error occurred while interacting with the respective provider's API
export class ProviderInteractionError extends DabbuError {
	constructor(message: string) {
		super(500, message, 'providerInteractionError')
	}
}

// The custom error handler we use on the server
export function errorHandler(
	error: Error,
	request: Express.Request,
	response: Express.Response,
	_: Express.NextFunction,
): void {
	if (isDabbuError(error)) {
		// If it is a custom error, return the code, message and reason accordingly
		response.status(error.code).json({
			code: error.code,
			error: {
				message: error.message,
				reason: error.reason,
			},
		})
	} else if (isAxiosError(error) && error.response) {
		// If it's an axios error, return the status code and the error
		const errorMessage =
			error.response.data &&
			error.response.data.error &&
			error.response.data.error.message
				? error.response.data.error.message
				: 'Unknown error'
		const errorReason =
			error.response.data &&
			error.response.data.error &&
			error.response.data.error.reason
				? error.response.data.error.reason
				: error.response.data.error.code || 'unknownReason'
		response.status(error.response.status).json({
			code: error.response.status,
			error: {
				message: errorMessage,
				reason: errorReason,
			},
		})
	} else {
		// Else the server has crashed, return an internalServerError
		response.status(500).json({
			code: 500,
			error: {
				message: error.message,
				reason: 'internalServerError',
			},
		})
	}
}
