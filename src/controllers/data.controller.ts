// Import all data providers
// Google Drive
import GoogleDriveDataProvider from '../providers/google-drive.provider'
const googleDriveDataProvider = new GoogleDriveDataProvider()
// Gmail
import GmailDataProvider from '../providers/gmail.provider'
const gmailDataProvider = new GmailDataProvider()
// OneDrive
import OneDriveDataProvider from '../providers/one-drive.provider'
const oneDriveDataProvider = new OneDriveDataProvider()
// The DataProvider interface that all providers implement
import DataProvider from '../provider'

// Import errors and utility functions
import { checkProviderId } from '../utils/guards.util'
// Import the logger
import Logger from '../utils/logger.util'
// Import necessary types
import { Request, Response, NextFunction } from 'express'

// Function that returns an instance of the Provider module by the ID
function getProviderModule(providerId: ProviderId): DataProvider {
	Logger.debug(
		`controller.data.getProviderModule: providerId = ${providerId}`,
	)

	switch (providerId) {
		case 'googledrive':
			Logger.debug(
				`controller.data.getProviderModule: returning googleDriveDataProvider`,
			)

			return googleDriveDataProvider
		case 'gmail':
			Logger.debug(
				`controller.data.getProviderModule: returning gmailDataProvider`,
			)

			return gmailDataProvider
		case 'onedrive':
			Logger.debug(
				`controller.data.getProviderModule: returning oneDriveDataProvider`,
			)

			return oneDriveDataProvider
	}
}

// The handlers for the various operations on the /data route

// List request (GET)
export async function list(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Check for a valid provider ID
	try {
		checkProviderId(request.query.providerId as string | undefined)
	} catch (err) {
		// Forward the error to the error handler and return
		next(err)
		return
	}

	// Get the appropriate provider
	const providerModule = getProviderModule(
		request.query.providerId as ProviderId,
	)

	// Call the list function
	providerModule
		.list(request.params, request.query, request.body, request.headers)
		// If the function executes successfully, send the response back
		.then((result: DabbuResponse) =>
			response.status(result.code).send(result),
		)
		// If there is an error, forward the error to the error handler
		.catch((error: Error) => next(error))
}

// Read request (GET)
export async function read(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Check for a valid provider ID
	try {
		checkProviderId(request.query.providerId as string | undefined)
	} catch (err) {
		// Forward the error to the error handler and return
		next(err)
		return
	}

	// Get the appropriate provider
	const providerModule = getProviderModule(
		request.query.providerId as ProviderId,
	)

	// Call the read function
	providerModule
		.read(request.params, request.query, request.body, request.headers)
		// If the function executes successfully, send the response back
		.then((result: DabbuResponse) =>
			response.status(result.code).send(result),
		)
		// If there is an error, forward the error to the error handler
		.catch((error: Error) => next(error))
}

// Create function (POST)
export async function create(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Check for a valid provider ID
	try {
		checkProviderId(request.query.providerId as string | undefined)
	} catch (err) {
		// Forward the error to the error handler and return
		next(err)
		return
	}

	// Get the appropriate provider
	const providerModule = getProviderModule(
		request.query.providerId as ProviderId,
	)

	// Call the create function
	providerModule
		.create(
			request.params,
			request.query,
			request.body,
			request.headers,
			request.file,
		)
		// If the function executes successfully, send the response back
		.then((result: DabbuResponse) =>
			response.status(result.code).send(result),
		)
		// If there is an error, forward the error to the error handler
		.catch((error: Error) => next(error))
}

// Update function (PATCH)
export async function update(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Check for a valid provider ID
	try {
		checkProviderId(request.query.providerId as string | undefined)
	} catch (err) {
		// Forward the error to the error handler and return
		next(err)
		return
	}

	// Get the appropriate provider
	const providerModule = getProviderModule(
		request.query.providerId as ProviderId,
	)

	// Call the create function
	providerModule
		.update(
			request.params,
			request.query,
			request.body,
			request.headers,
			request.file,
		)
		// If the function executes successfully, send the response back
		.then((result: DabbuResponse) =>
			response.status(result.code).send(result),
		)
		// If there is an error, forward the error to the error handler
		.catch((error: Error) => next(error))
}

// Delete function (DELETE)
export async function del(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Check for a valid provider ID
	try {
		checkProviderId(request.query.providerId as string | undefined)
	} catch (err) {
		// Forward the error to the error handler and return
		next(err)
		return
	}

	// Get the appropriate provider
	const providerModule = getProviderModule(
		request.query.providerId as ProviderId,
	)

	// Call the create function
	providerModule
		.delete(
			request.params,
			request.query,
			request.body,
			request.headers,
		)
		// If the function executes successfully, send the response back
		.then((result: DabbuResponse) =>
			response.status(result.code).send(result),
		)
		// If there is an error, forward the error to the error handler
		.catch((error: Error) => next(error))
}
