// Use the fs-extra library to ensure that the database file exists and
// to create it
import * as Fs from 'fs-extra'

// Use the env paths library to get the local config path
import EnvPaths from 'env-paths'
const configPath = EnvPaths('Dabbu Files API Server', { suffix: '' })
	.config
// Use sqlite3 for storing the client IDs and API keys
import Sql from 'sqlite3'

// Import utility functions
import { json } from './general.util'
import { checkClientIDApiKeyPair } from './guards.util'
// Import the logger
import Logger from './logger.util'

// Import necessary types
import { Request, Response, NextFunction } from 'express'
import { InvalidCredentialsError } from './errors.util'

// The client db
let clientsDb: Sql.Database | undefined = undefined

// Initialise the database: create the db file if it doesn't exist, then
// create the clients table if it doesn't exist
export async function init(
	dbPath = `${configPath}/auth/clients.db`,
): Promise<void> {
	Logger.debug(
		`util.auth.init: creating clients table if it does not exist`,
	)

	// Check if the db file exists
	if (!(await Fs.pathExists(dbPath)) && dbPath !== ':memory:') {
		// If not, create it
		await Fs.createFile(dbPath)
	}

	// Create a new database instance
	clientsDb = new Sql.Database(dbPath)

	return await new Promise<void>((resolve, reject) => {
		// Check that the database instance is non null
		if (!clientsDb) {
			Logger.error(
				`util.auth.init: Could not initialise sql database (clientsDb === undefined)`,
			)

			throw new Error('Could not initialise sql database')
		} else {
			// Else run the query
			// Create the clients table if it does not exist
			clientsDb.run(
				`create table if not exists clients (id string not null primary key, apiKey string not null)`,
				(error) => {
					// If there is an error, throw it
					if (error) {
						Logger.debug(
							`util.auth.init: error while running query: ${error}`,
						)
						reject(error)
					}

					// Else return successfully
					Logger.debug(`util.auth.init: initialised client table`)

					resolve()
				},
			)
		}
	})
}

// Retrieve a client from the database based on its ID
export async function getClient(clientId: string): Promise<Client> {
	Logger.debug(
		`util.auth.addClient: checking for client with ID ${clientId}`,
	)

	return await new Promise<Client>((resolve, reject) => {
		// Check that the database instance is non null
		if (!clientsDb) {
			Logger.error(
				`util.auth.init: Could not initialise sql database (clientsDb === undefined)`,
			)

			throw new Error('Could not initialise sql database')
		} else {
			// Else run the query
			// Insert the client into the database
			clientsDb.all(
				`select * from clients where id = ?`,
				clientId,
				(error: Error | undefined, results: Client[]) => {
					// If there is an error, throw it
					if (error) {
						Logger.debug(
							`util.auth.addClient: error while running query: ${error}`,
						)
						reject(error)
					}

					// Else check for the results
					Logger.debug(
						`util.auth.addClient: found client(s): ${json(results)}`,
					)

					if (results && results.length > 0) {
						// If there is a client, return it
						resolve(results[0])
					} else {
						reject(new Error('No client found'))
					}
				},
			)
		}
	})
}

// Insert a new client into the database
export async function addClient(client: Client): Promise<void> {
	Logger.debug(`util.auth.addClient: adding client ${json(client)}`)

	return await new Promise<void>((resolve, reject) => {
		// Check that the database instance is non null
		if (!clientsDb) {
			Logger.error(
				`util.auth.init: Could not initialise sql database (clientsDb === undefined)`,
			)

			throw new Error('Could not initialise sql database')
		} else {
			// Else run the query
			// Insert the client into the database
			clientsDb.run(
				`insert into clients values(?, ?)`,
				[client.id, client.apiKey],
				(error) => {
					// If there is an error, throw it
					if (error) {
						Logger.debug(
							`util.auth.addClient: error while running query: ${error}`,
						)
						reject(error)
					}

					// Else return succesfully
					Logger.debug(`util.auth.addClient: added client successfully`)

					resolve()
				},
			)
		}
	})
}

// Update the API key of a client in the database
export async function updateClient(client: Client): Promise<void> {
	Logger.debug(
		`util.auth.updateClient: updating client ${json(client)}`,
	)

	await new Promise<void>((resolve, reject) => {
		// Check that the database instance is non null
		if (!clientsDb) {
			Logger.error(
				`util.auth.init: Could not initialise sql database (clientsDb === undefined)`,
			)

			throw new Error('Could not initialise sql database')
		} else {
			// Else run the query
			// Insert the client into the database
			clientsDb.run(
				`update clients set apiKey = ? where id = ?`,
				[client.apiKey, client.id],
				(error) => {
					// If there is an error, throw it
					if (error) {
						Logger.debug(
							`util.auth.updateClient: error while running query: ${error}`,
						)
						reject(error)
					}

					// Else return succesfully
					Logger.debug(
						`util.auth.updateClient: updated client successfully`,
					)

					resolve()
				},
			)
		}
	})
}

// Delete a client from the database
export async function deleteClient(clientId: string): Promise<void> {
	Logger.debug(
		`util.auth.deleteClient: deleting client with id ${clientId}`,
	)

	await new Promise<void>((resolve, reject) => {
		// Check that the database instance is non null
		if (!clientsDb) {
			Logger.error(
				`util.auth.init: Could not initialise sql database (clientsDb === undefined)`,
			)

			throw new Error('Could not initialise sql database')
		} else {
			// Else run the query
			// Delete the record from the database
			clientsDb.run(
				`delete from clients where id=?`,
				[clientId],
				(error) => {
					// If there is an error, throw it
					if (error) {
						Logger.debug(
							`util.auth.deleteClient: error while running query: ${error}`,
						)
						reject(error)
					}

					// Else return successfully
					Logger.debug(
						`util.auth.deleteClient: deleted client successfully`,
					)

					resolve()
				},
			)
		}
	})
}

export default async function authHandler(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	Logger.debug(`util.auth.authHandler: checking for valid credentials`)
	// Check for a X-Credentials header
	try {
		Logger.debug(
			`util.auth.authHandler: checking for presence of X-Credentials header`,
		)

		checkClientIDApiKeyPair(request.headers as Record<string, any>)
	} catch (err) {
		// Forward the error to the error handler and return
		next(err)
		return
	}

	// Now if it does exist, parse it
	Logger.debug(
		`util.auth.authHandler: parsing header ${
			request.headers['X-Credentials'] ||
			request.headers['x-credentials']
		}`,
	)

	// The X-Credentials header will look like this: base64('<MY-CLIENT-ID>:<My-API-KEY>')
	// Surround it in a try-catch, any exception = invalid credentials
	try {
		let headerValue = (request.headers['X-Credentials'] ||
			request.headers['x-credentials']) as string
		// Decode the base64 to ascii
		headerValue = Buffer.from(headerValue, 'base64').toString('ascii')
		// Split the value by the : to get the client ID and api key
		const [clientId, apiKey] = headerValue.split(':')
		// Check if it is the database
		const client = await getClient(clientId)
		if (client.apiKey === apiKey.trim()) {
			request.creds = client
			next()
		} else {
			throw new InvalidCredentialsError(
				'Error while parsing the client ID - API key pair',
			)
		}
	} catch (err) {
		// Forward an InvalidCredentialsError to the error handler and return
		next(
			new InvalidCredentialsError(
				'Error while parsing the client ID - API key pair',
			),
		)
		return
	}
}
