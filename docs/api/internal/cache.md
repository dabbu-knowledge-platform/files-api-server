# Cache request

### Request

GET `/files-api/v3/internal/cache/:fileName`

Request headers:

- `X-Credentials` header must have the client ID - API key pair encoded as follows: `base64('<CLIENT ID>' + ':' + '<API KEY>')`

### Response

Format: JSON

- `code`: 200 | 404 | 500
- `error`?: object
	- `message`: string
	- `reason`: string
- `content`?: file data
