// Some types used in the code

// The library we use to convert html to markdown has no types, so declare it
declare module 'breakdance'

// Multer File type. It is not complete, this type exists simply to get rid of
// Typescript type errors
declare interface MulterFile {
	// Name of the form field associated with this file
	fieldname: string
	// Name of the file on the uploader's computer
	originalname: string
	// Value of the `Content-Type` header for this file
	mimetype: string
	// Size of the file in bytes
	size: number
	// `DiskStorage` only: Directory to which this file has been uploaded
	destination: string
	// `DiskStorage` only: Name of this file within `destination`
	filename: string
	// `DiskStorage` only: Full path to the uploaded file
	path: string
}

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
