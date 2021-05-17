// The error handler and all errors thrown intentionally are defined here

// Import utility functions
import { isDabbuError, isAxiosError } from './guards.util'
import { json } from './general.util'
// Import the logger
import Logger from './logger.util'

// Import necessary types
import { Request, Response, NextFunction } from 'express'

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
		// Log it
		Logger.debug(
			`objects.dabbu-error: BadRequestError thrown: ${message}`,
		)
		super(400, message, 'malformedUrl')
	}
}
// Missing provider specific variable in the request body; but returns a 400
// bad request code
export class MissingParameterError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: MissingParameterError thrown: ${message}`,
		)
		super(400, message, 'missingParam')
	}
}
// Invalid client ID - API key pair in the request header
export class InvalidCredentialsError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: InvalidCredentialsError thrown: ${message}`,
		)
		super(401, message, 'invalidCredentials')
	}
}
// Missing client ID - API key pair in the request header
export class MissingCredentialsError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: MissingCredentialsError thrown: ${message}`,
		)
		super(403, message, 'missingCredentials')
	}
}
// Invalid provider-specific credential in the request header
export class InvalidProviderCredentialsError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: InvalidProviderCredentialsError thrown: ${message}`,
		)
		super(401, message, 'invalidProviderCredentials')
	}
}
// Missing provider-specific credential in the request header
export class MissingProviderCredentialsError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: MissingProviderCredentialsError thrown: ${message}`,
		)
		super(403, message, 'missingProviderCredentials')
	}
}
// 404 not found
export class NotFoundError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: NotFoundError thrown: ${message}`,
		)
		super(404, message, 'notFound')
	}
}
// Conflict; used when a file already exists and you try to create it instead
// of update it
export class FileExistsError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: FileExistsError thrown: ${message}`,
		)
		super(409, message, 'conflict')
	}
}
// Not implemented; used when a certain request verb like POST (create) is not
// supported by a provider
export class NotImplementedError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: NotImplementedError thrown: ${message}`,
		)
		super(501, message, 'notImplemented')
	}
}
// Service unavailable; used when the provider is invalid or not enabled
export class InvalidProviderIdError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: InvalidProviderIdError thrown: ${message}`,
		)
		super(501, message, 'invalidProviderId')
	}
}
// An error occurred while interacting with the respective provider's API
export class ProviderInteractionError extends DabbuError {
	constructor(message: string) {
		// Log it
		Logger.debug(
			`objects.dabbu-error: ProviderInteractionError thrown: ${message}`,
		)
		super(500, message, 'providerInteractionError')
	}
}

// The custom error handler we use on the server
export default function errorHandler(
	error: Error,
	request: Request,
	response: Response,
	next: NextFunction,
): void {
	// Log it
	Logger.debug(`middleware.error: error forwarded to handler`)
	if (isDabbuError(error)) {
		// Log it
		Logger.error(
			`middleware.error: dabbu error thrown - ${json({
				code: error.code,
				error: {
					message: error.message,
					reason: error.reason,
				},
			})}`,
		)
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

		// Log it
		Logger.error(
			`middleware.error: axios error thrown - ${json({
				code: error.response.status,
				error: { message: errorMessage, reason: errorReason },
			})}`,
		)

		response.status(error.response.status).json({
			code: error.response.status,
			error: {
				message: errorMessage,
				reason: errorReason,
			},
		})
	} else {
		// Log it
		Logger.error(`middleware.error: server crash - ${json(error)}`)
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
