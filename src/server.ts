// Import the server
import app from './app'
// Import the function to initialise the client database
import * as ClientDb from './utils/auth.util'

// Import utility functions
import { json } from './utils/general.util'
// Import the logger
import Logger from './utils/logger.util'

// Import necessary types
import { AddressInfo } from 'net'

async function main() {
	// Initialise the client database
	await ClientDb.init()

	// Bind the server to the port given in the environment variable PORT or a
	// random port
	const server = app.listen(process.env.PORT || 0, () => {
		// Log the server info and print it to console too
		Logger.info(
			`server.version: v${
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				require('../package.json').version
			}`,
		)
		Logger.info('server.status: running')
		Logger.info(`server.meta: ip: ${json(server.address())}`)

		// Set the DABBU_FILES_API_SERVER_PORT environment variable
		process.env.DABBU_FILES_API_SERVER_PORT = (
			server.address()! as AddressInfo
		).port.toString()

		console.log(
			`Server running on ${process.env.DABBU_FILES_API_SERVER_PORT}`,
		)
	})
}

main()
