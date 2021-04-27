// Routes related to listing, downloading, creating, updating and deleting user
// data (files and folders)

// Use express to handle HTTP requests
import * as Express from 'express'
// Use multer to handle file upload for POST and PUT requests
import Multer from 'multer'

// Use the env paths library to get the local cache path
import EnvPaths from 'env-paths'

// Import errors and utility functions
import { isValidProvider } from '../utils/guards.util'
import { InvalidProviderError } from '../utils/errors.util'

// Define where multer should store the uploaded files
const multer = Multer({
	dest: EnvPaths('Dabbu Server', { suffix: '' }).cache,
})

// All the routes for the /data endpoint
const router = Express.Router()

// If the user makes a GET request to /data/:folderPath/, list
// out all the files/subfolders in the specified folder
router.get(
	'/:folderPath/',
	async (
		request: Express.Request,
		response: Express.Response,
		next: Express.NextFunction,
	) => {
		// Check for a valid provider ID
		if (
			typeof request.query.providerId != 'string' ||
			!isValidProvider(request.query.providerId)
		) {
			// If it is not valid, throw an error and return
			// We don't use throw here, instead we forward the error to the error
			// handler
			next(
				new InvalidProviderError(
					`Invalid provider ID - ${request.query.providerId}`,
				),
			)
			return
		}

		// Get the appropriate provider
		const providerFileName = `../providers/${request.query.providerId}.provider`
		const providerModule = new (
			await import(providerFileName)
		).default()

		// Call the list function
		providerModule
			.list(
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
	},
)

// If the user makes a GET request to /data/:folderPath/:fileName,
// return information about the file at that specified location
router.get(
	'/:folderPath/:fileName/',
	async (
		request: Express.Request,
		response: Express.Response,
		next: Express.NextFunction,
	) => {
		// Check for a valid provider ID
		if (
			typeof request.query.providerId != 'string' ||
			!isValidProvider(request.query.providerId)
		) {
			// If it is not valid, throw an error and return
			// We don't use throw here, instead we forward the error to the error
			// handler
			next(
				new InvalidProviderError(
					`Invalid provider ID - ${request.query.providerId}`,
				),
			)
			return
		}

		// Get the appropriate provider
		const providerFileName = `../providers/${request.query.providerId}.provider`
		const providerModule = new (
			await import(providerFileName)
		).default()

		// Call the read function
		providerModule
			.read(
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
	},
)

// If the user makes a POST request to /data/:folderPath/:fileName,
// upload the given file to that specified location
router.post(
	'/:folderPath/:fileName/',
	multer.single('content'),
	async (
		request: Express.Request,
		response: Express.Response,
		next: Express.NextFunction,
	) => {
		// Check for a valid provider ID
		if (
			typeof request.query.providerId != 'string' ||
			!isValidProvider(request.query.providerId)
		) {
			// If it is not valid, throw an error and return
			// We don't use throw here, instead we forward the error to the error
			// handler
			next(
				new InvalidProviderError(
					`Invalid provider ID - ${request.query.providerId}`,
				),
			)
			return
		}

		// Get the appropriate provider
		const providerFileName = `../providers/${request.query.providerId}.provider`
		const providerModule = new (
			await import(providerFileName)
		).default()

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
	},
)

// If the user makes a PUT request to /data/:folderPath/:fileName,
// update the file at that specified location
router.put(
	'/:folderPath/:fileName/',
	multer.single('content'),
	async (
		request: Express.Request,
		response: Express.Response,
		next: Express.NextFunction,
	) => {
		// Check for a valid provider ID
		if (
			typeof request.query.providerId != 'string' ||
			!isValidProvider(request.query.providerId)
		) {
			// If it is not valid, throw an error and return
			// We don't use throw here, instead we forward the error to the error
			// handler
			next(
				new InvalidProviderError(
					`Invalid provider ID - ${request.query.providerId}`,
				),
			)
			return
		}

		// Get the appropriate provider
		const providerFileName = `../providers/${request.query.providerId}.provider`
		const providerModule = new (
			await import(providerFileName)
		).default()

		// Call the update function
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
	},
)

// If the user makes a DELETE request to /data/:folderPath/
// :fileName, delete the file/folder at that specified location
router.delete(
	'/:folderPath/:fileName?/',
	async (
		request: Express.Request,
		response: Express.Response,
		next: Express.NextFunction,
	) => {
		// Check for a valid provider ID
		if (
			typeof request.query.providerId != 'string' ||
			!isValidProvider(request.query.providerId)
		) {
			// If it is not valid, throw an error and return
			// We don't use throw here, instead we forward the error to the error
			// handler
			next(
				new InvalidProviderError(
					`Invalid provider ID - ${request.query.providerId}`,
				),
			)
			return
		}

		// Get the appropriate provider
		const providerFileName = `../providers/${request.query.providerId}.provider`
		const providerModule = new (
			await import(providerFileName)
		).default()

		// Call the delete function
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
	},
)

export default router
