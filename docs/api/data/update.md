# Update request

### Request

PUT `/files-api/v3/data/:parentFolderPath/:fileName` (supports PATCH semantics)

Query parameters:

- `providerId`: 'googledrive' | 'gmail' | 'onedrive'

Request body:

- `content`?: file data
- `name`?: string [rename the file]
- `path`?: string [move the file to the new location; use absolute paths, not relative to current file location]
- `createdAtTime`?: string [use a format like this - 'Thu 22 Apr 2021 06:27:05 GMT+0530'; also note that this field may be ignored by some providers that cannot set the createdAtTime on a file]
- `lastModifiedTime`?: string [use a format like this - 'Thu 22 Apr 2021 06:27:05 GMT+0530'; also note that this field may be ignored by some providers that cannot set the lastModifiedTime on a file]
- Fields as required by provider

Request headers:

- `X-Credentials` header must have the client ID - API key pair encoded as follows: `base64('<CLIENT ID>' + ':' + '<API KEY>')`
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
