// Import the server
import app from './app'

// Import necessary types
import { AddressInfo } from 'net'

// Bind the server to the port given in the environment variable PORT or a
// random port
const server = app.listen(process.env.PORT || 0, () => {
	console.log(
		`Server up and running on port ${
			(server.address()! as AddressInfo).port
		}`,
	)
	// Set the DABBU_FILES_API_SERVER_PORT environment variable
	process.env.DABBU_FILES_API_SERVER_PORT = (server.address()! as AddressInfo).port.toString()
})
