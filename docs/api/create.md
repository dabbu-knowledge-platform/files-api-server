# Create request

### Request

POST `/files-api/v3/data/:parentFolderPath/:fileName`

Query parameters:

- `providerId`: 'googledrive' | 'gmail' | 'onedrive'

Request body:

- `content`: file data
- `createdAtTime`?: string [use a format like this - 'Thu 22 Apr 2021 06:27:05 GMT+0530'; also note that this field may be ignored by some providers that cannot set the createdAtTime on a file]
- `lastModifiedTime`?: string [use a format like this - 'Thu 22 Apr 2021 06:27:05 GMT+0530'; also note that this field may be ignored by some providers that cannot set the lastModifiedTime on a file]
- Fields as required by provider

Request headers:

- Headers as required by provider

### Response

Format: JSON

- `code`: 201 | 400 | 401 | 403 | 404 | 500 | 501
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
