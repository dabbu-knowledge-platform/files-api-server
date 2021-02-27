---
layout: home
title: Getting a list of enabled providers
nav_order: 11
parent: HTTP Requests
---

# Getting a list of enabled providers on the server

**GET**: `/providers`

- Request parameters: [None]

- Request body: [Empty]

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
    // Array of enabled provider IDs
    content: {
      providers: [
        "provider_id_1",
        "provider_id_2",
        ...
      ]
    }
  }
  ```

- Errors: [None]

**Using cURL:**

```bash
$ curl -i -X GET "http://localhost:8080/dabbu/v1/api/providers"
```

**Using NodeJS:**

```js
// The library used to make HTTP requests to the Dabbu Server
// Add it to your project (if you are using nodejs) using `npm install axios`
// For browser, refer to https://github.com/axios/axios#installing
const axios = require('axios').default

// Get the server address, provider ID and URL encode the folder path
let server = 'http://localhost:8080'

// The URL to send the request to
let url = `${server}/dabbu/v1/api/providers`
// Send a GET request
let res = await axios.get(url)

// Note: we are not handling errors here as we are using async-await, which
// will throw an error if the server returns an error response.

// Check if there is a response
if (res.data.content.providers.length > 0) {
  // Get the enabled providers from the response
  let enabledProviders = res.data.content.providers
  // Print the enabled providers
  console.log(enabledProviders)
} else {
  // There are no enabled providers
  console.log('No providers enabled')
}
```

**Using Python:**

```py
# Import the requests library
# Install it using `pip install requests`
# Refer to https://requests.readthedocs.io/en/master/
import requests

# The URL to send a GET request to
URL = 'http://localhost:8080/dabbu/v1/api/providers'

# Make the GET request
res = requests.get(url = URL)

# Extract the JSON from the response
data = res.json()

# Parse the response and check if there are any enabled providers
if res.content.providers.length > 0:
  # Print the any enabled providers
  print(res.content.providers)
else:
  # There are no enabled providers
  print('No providers enabled')
```
