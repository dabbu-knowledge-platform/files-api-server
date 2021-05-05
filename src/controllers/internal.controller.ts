// Use the filesystem library to interact with files
import * as Fs from 'fs-extra'

// Use the env paths library to get the local cache path
import EnvPaths from 'env-paths'
const cachePath = EnvPaths('Dabbu Server', { suffix: '' }).cache

// Import errors and utility functions
import { checkRelativePath } from '../utils/guards.util'
// Import necessary types
import { Request, Response, NextFunction } from 'express'

// The handlers for the various operations on the /internal route

// Cache request (GET)
export async function cache(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	// Don't allow relative paths, else they will be able to access the rest of the file system
	try {
		checkRelativePath(request.params.filePath)
	} catch (err) {
		// Forward the error to the error handler and return
		next(err)
		return
	}

	// Check if the file exists
	if (
		!(await Fs.pathExists(`${cachePath}/${request.params.filePath}`))
	) {
		// If it doesn't, return a 404
		const result = {
			code: 404,
			error: {
				message: `File ${`${cachePath}/${request.params.filePath}`} was not found`,
				reason: 'notFound',
			},
		}

		response.status(result.code).send(result)
		return
	}

	// Stream the file back
	response.download(`${cachePath}/${request.params.filePath}`)
}
