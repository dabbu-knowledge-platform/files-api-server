# Replace API key request

### Request

POST `/files-api/v3/clients/:clientId/`

Request headers:

- `X-Credentials` header must have the client ID - API key pair encoded as follows: `base64('<CLIENT ID>' + ':' + '<API KEY>')`

### Response

Format: JSON

- `code`: 200 | 500
- `error`?: object
	- `message`: string
	- `reason`: string
- `content`?: object
	- `id`: string
  - `apiKey`: string
