// Use winston for logging
import Winston from 'winston'
// Use morgan to automatically log HTTP requests
import Morgan from 'morgan'
// Use the env paths library to get the local config path
import EnvPaths from 'env-paths'
const configPath = EnvPaths('Dabbu Files API Server', {
	suffix: '',
}).config

// First define the Winston config

// The severity levels a log can have
const levels = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	debug: 4,
}

// Define different colors for each level
const colors = {
	error: 'red',
	warn: 'yellow',
	info: 'green',
	http: 'magenta',
	debug: 'white',
}

// Tell winston that we want to link the colors
// defined above to the severity levels
Winston.addColors(colors)

// Define which transports the logger must use to print out messages
// Do not print logs to console as they contain sensitive information
const transports = [
	// Save the logs in a file
	new Winston.transports.File({
		filename: `${configPath}/logs/files-api-server.log`,
		format: Winston.format.combine(
			// Add the message timestamp with the preferred format
			Winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
			// Define the format of the message showing the timestamp, the level and
			// the message
			Winston.format.printf(
				(info) => `${info.timestamp} ${info.level}: ${info.message}`,
			),
		),
	}),
	// Save the logs in a JSON format too
	new Winston.transports.File({
		filename: `${configPath}/logs/files-api-server.json.log`,
		format: Winston.format.combine(
			// Add the message timestamp with the preferred format
			Winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
			// Define the format of the message showing the timestamp, the level and
			// the message
			Winston.format.printf((info) =>
				// Remove json prettification we do using the json() function
				JSON.stringify(info).replace(/\\n  /g, '').replace(/\\n/g, ''),
			),
		),
	}),
]

// Create the logger instance that has to be exported
// and used to log messages.
const Logger = Winston.createLogger({
	level: 'debug',
	levels,
	transports,
})

// Export the logger by default as we will be using it most
export default Logger

// Now define the morgan config

// Define the morgan middleware and export it
export const MorganMiddleware = Morgan(
	// Define the format and content of the log message
	':method :url by :remote-addr returned :status in :response-time ms',
	// Override the stream method by telling Morgan to use Winston instead of
	// console.log
	{
		// Use the http severity and remove the \n at the end, else we end up with a
		// double \n
		stream: {
			write: (message) =>
				Logger.http(
					`request.completed: ${message.substring(
						0,
						message.lastIndexOf('\n'),
					)}`,
				),
		},
	},
)
