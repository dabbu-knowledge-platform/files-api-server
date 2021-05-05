// Type guards to check the type of a variable

// Import the logger
import Logger from './logger.util'
// Import necessary types
import { AxiosError } from 'axios'
import {
	BadRequestError,
	DabbuError,
	InvalidProviderError,
	UnauthorizedError,
} from './errors.util'

// Check if the
export function isValidProvider(
	providerId: string | undefined,
): providerId is ProviderId {
	const isValid = (
		providerId === 'googledrive' ||
		providerId === 'gmail' ||
		providerId === 'onedrive'
	)
	
	Logger.debug(`util.guard.isValidProvider: ${providerId} is ${isValid ? 'a valid' : 'an invalid'} provider ID`)
	
	return isValid
}

export function isDabbuError(error: Error): error is DabbuError {
	const isDabbu = (error as DabbuError).isDabbuError !== undefined

	Logger.debug(`util.guard.isDabbuError: error is ${isDabbu ? 'a dabbu error' : 'not a dabbu error'}`)

	return isDabbu
}

export function isAxiosError(error: Error): error is AxiosError {
	const isAxios = (error as AxiosError).isAxiosError !== undefined

	Logger.debug(`util.guard.isAxiosError: error is ${isAxios ? 'an axios error' : 'not an axios error'}`)

	return isAxios
}

// Check if the request headers contain an Authorization header. If not, throw
// a 403 Unauthorized error
export function checkAccessToken(
	headers: Record<string, string | number>,
): void {
	const headersContainAccessToken = headers['Authorization'] || headers['authorization']

	Logger.debug(`util.guard.checkAccessToken: headers ${headersContainAccessToken ? 'contain an access token' : 'do not contain an access token'}`)
	
	if (!headersContainAccessToken) {
		throw new UnauthorizedError(
			'Missing access token in `Authorization` header',
		)
	}
}

// Check if the provider ID specified is a valid one. If not, throw a 501
// Invalid Provider error
export function checkProviderId(providerId: string | undefined): void {
	const providerIdIsValid = providerId || isValidProvider(providerId)

	Logger.debug(`util.guard.checkProviderId: provider ID ${providerId} is ${providerIdIsValid ? 'valid' : 'invalid'}`)

	if (!providerIdIsValid) {
		throw new InvalidProviderError(
			`Invalid provider ID - ${providerId}`,
		)
	}
}

// Check if any path is relative
export function checkRelativePath(...paths: Array<string>): void {
	Logger.debug(`util.guard.checkRelativePath: checking ${paths}`)
	for (const path of paths) {
		const isRelative = path && (path.includes('/..') || path.includes('/.'))

		Logger.debug(`util.guard.checkRelativePath: path ${path} is ${!isRelative ? 'valid' : 'invalid'}`)

		if (isRelative) {
			throw new BadRequestError('Relative paths are not allowed')
		}
	}
}
