// Type guards to check the type of a variable

// Import the logger
import Logger from './logger.util'
// Import necessary types
import { AxiosError } from 'axios'
import {
	BadRequestError,
	DabbuError,
	InvalidProviderIdError,
	MissingCredentialsError,
	MissingProviderCredentialsError,
} from './errors.util'

// Check if the
export function isValidProvider(
	providerId: string | undefined,
): providerId is ProviderId {
	const isValid =
		providerId === 'googledrive' ||
		providerId === 'gmail' ||
		providerId === 'onedrive'

	Logger.debug(
		`util.guard.isValidProvider: ${providerId} is ${
			isValid ? 'a valid' : 'an invalid'
		} provider ID`,
	)

	return isValid
}

export function isDabbuError(error: Error): error is DabbuError {
	const isDabbu = (error as DabbuError).isDabbuError !== undefined

	Logger.debug(
		`util.guard.isDabbuError: error is ${
			isDabbu ? 'a dabbu error' : 'not a dabbu error'
		}`,
	)

	return isDabbu
}

export function isAxiosError(error: Error): error is AxiosError {
	const isAxios = (error as AxiosError).isAxiosError !== undefined

	Logger.debug(
		`util.guard.isAxiosError: error is ${
			isAxios ? 'an axios error' : 'not an axios error'
		}`,
	)

	return isAxios
}

// Check if the request headers contain an X-Credentials header. If not, throw
// a 403 Unauthorized error
export function checkClientIDApiKeyPair(
	headers: Record<string, string | number>,
): void {
	const headersContainCredentials =
		headers['X-Credentials'] ||
		(headers['x-credentials'] &&
			typeof (headers['X-Credentials'] || headers['x-credentials']) ===
				'string')

	Logger.debug(
		`util.guard.checkClientIDApiKeyPair: headers ${
			headersContainCredentials
				? 'contain a client ID - API key pair'
				: 'do not contain a client ID - API key pair'
		}`,
	)

	if (!headersContainCredentials) {
		throw new MissingCredentialsError(
			'Missing client ID - API key pair in `X-Credentials` header',
		)
	}
}

// Check if the request headers contain an X-Provider-Credentials header. If not, throw
// a 403 Unauthorized error
export function checkProviderCredentials(
	headers: Record<string, string | number>,
): void {
	const headersContainProviderCredentials =
		headers['X-Provider-Credentials'] ||
		(headers['x-provider-credentials'] &&
			typeof (
				headers['X-Provider-Credentials'] ||
				headers['x-provider-credentials']
			) === 'string')

	Logger.debug(
		`util.guard.checkProviderCredentials: headers ${
			headersContainProviderCredentials
				? 'contain a provider auth token'
				: 'do not contain a provider auth token'
		}`,
	)

	if (!headersContainProviderCredentials) {
		throw new MissingProviderCredentialsError(
			'Missing provider-specific access token in `X-Provider-Credentials` header',
		)
	}
}

// Check if the provider ID specified is a valid one. If not, throw a 501
// Invalid Provider error
export function checkProviderId(providerId: string | undefined): void {
	const providerIdIsValid = providerId && isValidProvider(providerId)

	Logger.debug(
		`util.guard.checkProviderId: provider ID ${providerId} is ${
			providerIdIsValid ? 'valid' : 'invalid'
		}`,
	)

	if (!providerIdIsValid) {
		throw new InvalidProviderIdError(
			`Invalid provider ID - ${providerId}`,
		)
	}
}

// Check if any path is relative
export function checkRelativePath(...paths: Array<string>): void {
	Logger.debug(`util.guard.checkRelativePath: checking ${paths}`)
	for (const path of paths) {
		const isRelative =
			path && (path.includes('/..') || path.includes('/.'))

		Logger.debug(
			`util.guard.checkRelativePath: path ${path} is ${
				!isRelative ? 'valid' : 'invalid'
			}`,
		)

		if (isRelative) {
			throw new BadRequestError('Relative paths are not allowed')
		}
	}
}
