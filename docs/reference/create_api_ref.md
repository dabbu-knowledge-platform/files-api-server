---
layout: home
nav_order: 7
parent: HTTP Requests
---

# Creating a new file

**Using cURL:**

```bash
$ curl -i -X POST "http://localhost:8080/dabbu/v1/api/data/<provider_id>/<folder_path>/<file_name>/" \
  > -H "Authorization: Bearer <access_token>" \ # Only needed if the provider requires authorization
  > -F "content=@<path_to_local_file_to_upload>" \ # Required
  > -F "createdAtTime=2021-06-07T07:06:42Z" \ # Optional, if you want to set the createdAtTime of a file
  > -F "lastModifiedTime=2021-06-07T07:06:42Z" \ # Optional, if you want to set the lastModifiedTime of a file
  > -F "field1=value1" -F "field2=value2" # Only needed if the provider requires certain fields
```

**Using NodeJS:**

```js
// The library used to make HTTP requests to the Dabbu Server
// Add it to your project (if you are using nodejs) using `npm install axios`
// For browser, refer to https://github.com/axios/axios#installing
const axios = require('axios').default
// The library used to encode the request body as form data
// Required only in nodejs environments, not browsers
// Add it to your project (if you are using nodejs) using `npm install form-data`
const FormData = require('form-data')
// The file system library, to create a readable stream of a
// file's contents
const fs = require('fs')

// Get the server address, provider ID and URL encode the folder path
let server = 'http://localhost:8080'
let provider = 'hard_drive' || 'google_drive' || 'one_drive' || 'gmail'
let urlEncodedFolderPath = encodeURIComponent('/Downloads')
let urlEncodedFileName = encodeURIComponent('dabbu_server_log.txt')

// The path to a local file to upload
let localFilePath = './dabbu_server_log.txt'

// Make a form data object to upload the file's contents
let formData = new FormData()
// Add the file's data as a readable stream to the content field
formData.append('content', fs.createReadStream(localFilePath), {
  filename: 'dabbu_server_log.txt',
})

// Add whatever fields are required by the provider in the request
// body here
formData.append('field1', 'value1')

// If you want to set the createdAtTime or lastModifiedTime of the
// file while uploading, add that to the body
formData.append('createdAtTime', '2021-06-07T07:06:42Z')
formData.append('lastModifiedTime', '2021-06-07T07:06:42Z')

// Use the headers that the form-data modules sets
let formHeaders = formData.getHeaders()

// The URL to send the request to
let url = `${server}/dabbu/v1/api/data/${provider}/${urlEncodedFolderPath}/${urlEncodedFileName}`
// Send a POST request
let res = await axios.post(url, formData, {
  headers: {
    ...formHeaders, // The form headers
    Authorization: `Bearer ${accessToken}`, // Only needed if the provider requires authorization
  },
})

if (res.status === 200) {
  // File was created
  console.log('File created successfully')
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

# Open a local file
localFileHandle = open('./dabbu_server_log.txt', 'rb')

# The URL to send a post request to
# If you want to delete a folder, simply omit the file name
URL = 'http://localhost:8080/dabbu/v1/api/data/{providerId}/{encodedFolderPath}/{encodedFileName}'.format(
  providerId = providerId,
  encodedFolderPath = urllib.parse.quote(folderPath),
  encodedFileName = urllib.parse.quote(fileName)
)

# Make the POST request
res = requests.post(
  url = URL,
  files = {
    'content': localFileHandle
  },
  data = {
    # In case you want to set the createdAtTime and
    # lastModifiedTime while uploading the file
    'createdAtTime': '2021-06-07T07:06:42Z',
    'lastModifiedTime': '2021-06-07T07:06:42Z',
    # Any additional fields the provider requires
    'field1': 'value1'
  },
  headers = {
    # Only needed if the provider requires authorization
    'Authorization': 'Bearer {accessToken}'.format(accessToken = '<access_token>')
  }
)

# Extract the JSON from the response
data = res.json()

# Parse the response and check if the server created the file
if res.ok:
  print('File successfully created')
else:
  # An error occurred
  print('An error occurred: {err}'.format(err = res.error))
```
