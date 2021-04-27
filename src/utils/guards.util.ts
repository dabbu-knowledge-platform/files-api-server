// Type guards to check the type of a variable

// Import necessary types
import { AxiosError } from 'axios'
import { DabbuError } from './errors.util'

//
export function isValidProvider(
	providerId: string,
): providerId is ProviderId {
	return (
		providerId === 'google-drive' ||
		providerId === 'gmail' ||
		providerId === 'one-drive'
	)
}

export function isDabbuError(error: Error): error is DabbuError {
	return (error as DabbuError).isDabbuError !== undefined
}

export function isAxiosError(error: Error): error is AxiosError {
	return (error as AxiosError).isAxiosError !== undefined
}
