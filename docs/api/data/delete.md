# Delete request

### Request

DELETE `/files-api/v3/data/:parentFolderPath/:fileName?`

Query parameters:

- `providerId`: 'googledrive' | 'gmail' | 'onedrive'

Request body:

- Fields as required by provider

Request headers:

- `X-Credentials` header must have the client ID - API key pair encoded as follows: `base64('<CLIENT ID>' + ':' + '<API KEY>')`
- Headers as required by provider

### Response

Format: JSON

- `code`: 204 | 400 | 401 | 403 | 404 | 500 | 501
- `error`?: object
	- `message`: string
	- `reason`: string
