// Import necessary types
import { Request, Response, NextFunction } from 'express'

// The handlers for the various operations on the /provider route

// List providers request (GET)
export async function list(
	request: Request,
	response: Response,
	next: NextFunction,
): Promise<void> {
	const result = {
		code: 200,
		content: ['googledrive', 'gmail', 'onedrive'],
	}

	response.status(result.code).send(result)
}
