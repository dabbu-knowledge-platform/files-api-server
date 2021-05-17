// Use nanoid to generate client ID and API key
import { nanoid as Nanoid } from 'nanoid'
// Import the database methods
import {
	addClient,
	updateClient,
	deleteClient,
} from '../utils/auth.util'

// Import necessary types
import { Request, Response, NextFunction } from 'express'

// The handlers for the various operations on the /client route

// Create client (POST)
export async function create(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Generate a random client ID and api key
	const client = {
		id: Nanoid(),
		apiKey: Nanoid(128),
	}

	// Try adding it to the database
	try {
		// Add it
		await addClient(client)

		// If it suceeds, return it
		response.status(200).send({
			code: 200,
			content: client,
		})
	} catch (err) {
		// Catch the error if any, and pass it back as an internalServerError
		response.status(500).send({
			code: 500,
			error: {
				message: 'Error while creating new client',
				reason: 'internalServerError',
			},
		})
	}
}

// Revoke current API key and generate new one (POST)
export async function replace(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Generate an api key and keep the client ID the same as the one
	// passed in the url
	const client = {
		id: request.params.clientId,
		apiKey: Nanoid(128),
	}

	// Try adding it to the database
	try {
		// Add it
		await updateClient(client)

		// If it suceeds, return it
		response.status(200).send({
			code: 200,
			content: client,
		})
	} catch (err) {
		// Catch the error if any, and pass it back as an internalServerError
		response.status(500).send({
			code: 500,
			error: {
				message: 'Error while updating API key',
				reason: 'internalServerError',
			},
		})
	}
}

// Delete client ID and connected API key (DELETE)
export async function revoke(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Try removing it from the database
	try {
		// Delete it
		await deleteClient(request.params.clientId)

		// If it suceeds, return it
		response.sendStatus(204)
	} catch (err) {
		// Catch the error if any, and pass it back as an internalServerError
		response.status(500).send({
			code: 500,
			error: {
				message: 'Error while deleting client',
				reason: 'internalServerError',
			},
		})
	}
}
