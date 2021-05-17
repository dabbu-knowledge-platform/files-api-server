# List request

### Request

GET `/files-api/v3/providers`

Request headers:

- `X-Credentials` header must have the client ID - API key pair encoded as follows: `base64('<CLIENT ID>' + ':' + '<API KEY>')`

### Response

Format: JSON

- `code`: 200
- `content`: array<string>
