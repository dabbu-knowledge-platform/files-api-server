// Some types used in the code

// The library we use to convert html to markdown has no types, so declare it
declare module 'breakdance'

// Use UTC Unix timestamps while dealing with dates
declare type UnixTimestamp = number

// A DabbuResource can contain the following fields
declare type FieldName =
	| 'name'
	| 'path'
	| 'kind'
	| 'provider'
	| 'mimeType'
	| 'size'
	| 'createdAtTime'
	| 'lastModifiedTime'
	| 'contentUri'

// All the providers
declare type ProviderId = 'google-drive' | 'gmail' | 'one-drive'

// Representation of a file/folder by Dabbu
declare interface DabbuResource {
	name: string
	path: string
	kind: 'folder' | 'file'
	provider: ProviderId
	mimeType: string
	size: number
	createdAtTime: UnixTimestamp
	lastModifiedTime: UnixTimestamp
	contentUri: string
}

// Types for requests and responses

// List request options
declare interface DabbuListRequestOptions {
	compareWith?: FieldName
	operator?: '>' | '<' | '='
	value?: string | number | Date
	orderBy?: FieldName
	direction?: 'asc' | 'desc'
	exportType?: string
	limit?: number
	nextSetToken?: string
}

// DabbuResponse to any request
declare interface DabbuResponse {
	code: number
	error?: { message: string; reason: string }
	content?: Array<DabbuResource> | DabbuResource
	nextSetToken?: string
}
