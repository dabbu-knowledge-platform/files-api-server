---
layout: home
title: Listing files and folders in a specific folder
nav_order: 6
parent: HTTP Requests
---

# Listing files and folders in a specific folder

**GET**: `/data/:providerId/:folderPath`

- Request parameters: [Compulsory]

  - `providerId`: Provider ID - `string`
  - `folderPath`: Path to folder - `string`

- Query parameters: [Optional]

  - `compareWith`: Compare items by a field (specify field name) - `string`
  - `operator`: Only take items with value equal to, less than or greater than the value specified - `enum<string> - =, <, >`
  - `value`: The value of the field the item must be equal to, less than or greater than - `string`
  - `orderBy`: Order by a field (specify field name) - `string`
  - `direction`: The order in which to sort the items - `enum<string> - asc, desc`
  - `exportType`: Type of URI that the content should be returned in; `view` for opening it in the provider's editor, `media` for a download link, other values may be accepted by the provider - `string`

- Request body: [Optional]

  - The request body may contain any fields that the provider requires to execute the request

- Response:

  ```json
  {
    // HTTP reponse status code
    "code": int,
    // Only exists if there is an error
    "error": {
      // The error message (user-friendly)
      "message": string,
      // The reason for the error (computer-friendly)
      "reason": string
    },
    // Array of files and folders in the specified folder
    content: [
      Files object {
        "name": string,
        "kind": enum<string>(file, folder),
        "provider": string,
        "path": string,
        "mimeType": string,
        "size": int,
        "createdAtTime": timestamp,
        "lastModifiedTime": timestamp,
        "contentURI": URI
      }
    ]
  }
  ```

- Errors:
  - `400`: Bad URL, invalid syntax for query parameters - `malformedURL`
  - `404`: The folder was not found - `notFound`
  - `500`: Internal server error, used if an uncaught exception appears - `internalServerError`
  - `503`: Provider not available - `providerNotFound`

**Using cURL:**

```bash
$ curl -i -X GET "http://localhost:8080/dabbu/v1/api/data/<provider id>/<folder path>/?exportType=view" \
  > -H "Authorization: Bearer <access_token>" \ # Only needed if the provider requires authorization
  > -d "field1: value1" -d "field2: value2" # Only needed if the provider requires certain fields
```

**Using NodeJS:**

```js
// The library used to make HTTP requests to the Dabbu Server
// Add it to your project (if you are using nodejs) using `npm install axios`
// For browser, refer to https://github.com/axios/axios#installing
const axios = require('axios').default

// Get the server address, provider ID and URL encode the folder path
let server = 'http://localhost:8080'
let provider = 'hard_drive' || 'google_drive' || 'one_drive' || 'gmail'
let urlEncodedFolderPath = encodeURIComponent('/Downloads')

// The URL to send the request to
let url = `${server}/dabbu/v1/api/data/${provider}/${encodedFolderPath}?exportType=view`
// Send a GET request
let res = await axios.get(url, {
  // Only needed if the provider requires certain fields, else
  // skip the data: {...} part entirely
  data: {
    field1: 'value1',
    field2: 'value2',
  },
  // Only needed if the provider requires authorization, else
  // skip the headers: {...} part entirely
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
})

// Note: we are not handling errors here as we are using async-await, which
// will throw an error if the server returns an error response.

// Check if there is a response
if (res.data.content.length > 0) {
  // Get the files from the response
  let files = res.data.content
  // Print the files
  console.log(JSON.stringify(files))
} else {
  // Else print out empty folder
  console.log('Empty folder')
}
```

**Using Python:**

```py
# Import the requests library
# Install it using `pip install requests`
# Refer to https://requests.readthedocs.io/en/master/
import requests
# To encode the folder path
import urllib

# The provider ID
providerId = 'hard_drive' or 'google_drive' or 'one_drive' or 'gmail'
# The folder path
folderPath = '/Downloads'

# The URL to send a GET request to
URL = 'http://localhost:8080/dabbu/v1/api/data/{providerId}/{encodedFolderPath}?exportType=view'.format(
  providerId = providerId,
  encodedFolderPath = urllib.parse.quote(folderPath)
)

# Make the GET request
res = requests.get(
  url = URL,
  data = {
    # Only needed if the provider requires certain
    # fields in the request body
    'field1': 'value1'
  },
  headers = {
    # Only needed if the provider requires authorization
    'Authorization': 'Bearer {accessToken}'.format(accessToken = '<access_token>')
  }
)

# Extract the JSON from the response
data = res.json()

# Parse the response and check if there are files
if res.content.length > 0:
  # Print the files
  print(res.content)
else:
  # It is an empty folder
  print('Empty folder')
```
