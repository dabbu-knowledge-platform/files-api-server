# Read request

### Request

GET `/files-api/v3/data/:parentFolderPath/:fileName`

Query parameters:

- `providerId`: 'googledrive' | 'gmail' | 'onedrive'
- `exportType`?: string [usually 'media', 'view', or the mime type you want the output file to be in, e.g.: 'application/pdf' for a PDF file]

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
- `content`?: object
	- `name`: string
	- `path`: string
	- `kind`: 'folder' | 'file'
	- `provider`: 'googledrive' | 'gmail' | 'onedrive'
	- `mimeType`: string
	- `size`: number
	- `createdAtTime`: string
	- `lastModifiedTime`: string
	- `contentUri`: string
