---
layout: home
title: Retrieving a file's data
nav_order: 6
parent: HTTP Requests
---

# Retrieving a file's data

**GET**: `/data/:providerId/:folderPath/:fileName`

- Request parameters: [Compulsory]
  - `providerId`: Provider ID - `string`
  - `folderPath`: Path to folder - `string`
  - `fileName`: Name of the file - `string`

- Query parameters: [Optional]
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
    // The file that was requested
    content: Files object {
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
  }
  ```

- Errors:
  - `404`: The folder was not found - `notFound`
  - `500`: Internal server error, used if an uncaught exception appears - `internalServerError`
  - `503`: Provider not available - `providerNotFound`

**Using cURL:**

```bash
$ curl -i -X GET "http://localhost:8080/dabbu/v1/api/data/<provider_id>/<folder_path>/<file_name>/?exportType=media" \
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
let urlEncodedFileName = encodeURIComponent('dabbu_server_log.txt')

// The URL to send the request to
let url = `${server}/dabbu/v1/api/data/${provider}/${encodedFolderPath}?exportType=media`
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
if (res.data.content) {
  // Get the files from the response
  let file = res.data.content
  // Refer to the object description above to get the file data
  // You can fetch the file's content by running another GET
  // request on the file's contentURI (`file.contentURI`)
  console.log(JSON.stringify(file))
} else {
  // Else there was no response from the server or an error was thrown
  console.log(
    'No response from server, error should have been thrown before this'
  )
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
# The file name
fileName = 'dabbu_server_log.txt'

# The URL to send a GET request to
URL = 'http://localhost:8080/dabbu/v1/api/data/{providerId}/{encodedFolderPath}/{encodedFileName}?exportType=media'.format(
  providerId = providerId,
  encodedFolderPath = urllib.parse.quote(folderPath),
  encodedFileName = urllib.parse.quote(fileName)
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

# Parse the response and check if the server returned a file
if res.content != None:
  # Refer to the object description above to get the file data
  # You can fetch the file's content by running another GET
  # request on the file's contentURI (`file.contentURI`)
  print(res.content)
else:
  # An error occurred
  print('An error occurred: {err}'.format(err = res.error))
```
