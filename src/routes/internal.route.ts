// Routes related to accessing generated files

// Use express to handle HTTP requests
import * as Express from 'express'

// Use the env paths library to get the local cache path
import EnvPaths from 'env-paths'
const cachePath = EnvPaths('Dabbu Server', { suffix: '' }).cache

// Import errors and utility functions
import { checkRelativePath } from '../utils/general.util'

// All the routes for the /internal endpoint
const router = Express.Router()

// If the user makes a GET request to /internal/cache/:filePath, send back the
// requested file/folder from cache
router.get(
	'/cache/:filePath',
	async (
		request: Express.Request,
		response: Express.Response,
		next: Express.NextFunction,
	) => {
		// Don't allow relative paths, else they will be able to access the rest of the file system
		try {
			checkRelativePath(request.params.filePath)
		} catch (err) {
			// Forward the error to the error handler
			next(err)
		}

		// Stream the file back
		response.download(`${cachePath}/${request.params.filePath}`)
	},
)

export default router
