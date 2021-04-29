// Type guards to check the type of a variable

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
	providerId: string,
): providerId is ProviderId {
	return (
		providerId === 'googledrive' ||
		providerId === 'gmail' ||
		providerId === 'onedrive'
	)
}

export function isDabbuError(error: Error): error is DabbuError {
	return (error as DabbuError).isDabbuError !== undefined
}

export function isAxiosError(error: Error): error is AxiosError {
	return (error as AxiosError).isAxiosError !== undefined
}

// Check if the request headers contain an Authorization header. If not, throw
// a 403 Unauthorized error
export function checkAccessToken(
	headers: Record<string, string | number>,
): void {
	if (!headers['Authorization'] && !headers['authorization']) {
		throw new UnauthorizedError(
			'Missing access token in `Authorization` header',
		)
	}
}

// Check if the provider ID specified is a valid one. If not, throw a 501
// Invalid Provider error
export function checkProviderId(providerId: string | undefined): void {
	if (!providerId || !isValidProvider(providerId)) {
		throw new InvalidProviderError(
			`Invalid provider ID - ${providerId}`,
		)
	}
}

// Check if any path is relative
export function checkRelativePath(...paths: Array<string>): void {
	for (const path of paths) {
		if (path && (path.includes('/..') || path.includes('/.'))) {
			throw new BadRequestError('Relative paths are not allowed')
		}
	}
}
