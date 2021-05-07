# List request

### Request

GET `/files-api/v3/data/:pathToFolder/`

Query parameters:

- `providerId`: 'googledrive' | 'gmail' | 'onedrive'
- `compareWith`?: 'name' | 'path' | 'kind' | 'provider' | 'mimeType' | 'size' | 'createdAtTime' | 'lastModifiedTime' | 'contentUri'
- `operator`?: > | < | =
- `value`?: string | number
- `orderBy`?: 'name' | 'path' | 'kind' | 'provider' | 'mimeType' | 'size' | 'createdAtTime' | 'lastModifiedTime' | 'contentUri'
- `direction`?: 'asc' | 'desc'
- `exportType`?: string [usually 'media', 'view', or the mime type you want the output file to be in, e.g.: 'application/pdf' for a PDF file]
- `limit`?: number
- `nextSetToken`?: string

Request body:

- Fields as required by provider

Request headers:

- Headers as required by provider

### Response

Format: JSON

- `code`: 200 | 400 | 401 | 403 | 404 | 500 | 501
- `error`?: object
	- `message`: string
	- `reason`: string
- `content`?: array<object>
	- `name`: string
	- `path`: string
	- `kind`: 'folder' | 'file'
	- `provider`: 'googledrive' | 'gmail' | 'onedrive'
	- `mimeType`: string
	- `size`: number
	- `createdAtTime`: string
	- `lastModifiedTime`: string
	- `contentUri`: string
- `nextSetToken`?: string [supply this in the query parameters of the next request to get the next set of files]