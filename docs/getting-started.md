# Dabbu Files Rest API

## What is a REST API?

An API is an application programming interface - in short, it’s a set of rules that lets programs talk to each other, exposing data and functionality across the internet in a consistent format.

REST stands for Representational State Transfer. This is an architectural pattern that describes how distributed systems can expose a consistent interface. When people use the term ‘REST API,’ they are generally referring to an API accessed via HTTP protocol at a predefined set of URLs.

These URLs represent various resources - any information or content accessed at that location, which can be returned as JSON, HTML, audio files, or images. Often, resources have one or more methods that can be performed on them over HTTP, like GET, POST, PUT and DELETE.

The Dabbu Files API allows you to list, get info about, download, create, update, rename, move and delete files/folders stored in a user's cloud storage, no matter what the provider storing that data may be - Google Drive, Gmail, or One Drive. Here is a quick guide to get you started on this in several different environments (if the examples for certain languages are missing, please feel free to add them and submit a pull request).

## Working with the API

There is an instance of the server running on https://dabbu-server.herokuapp.com/. Though this server is free to use, it is highly recommended to run the server on your own. Instructions to do that are given [here](./running-the-server.md).

### Authenticate with the Server

The Files API Server uses authentication to protect clients' data. To use the Files API Server, you must first register a client with it, by making a `POST` request to the `/clients` endpoint. This will return a client ID and API key, which must be specially encoded and supplied with all subsequent requests.

Terminal (using cURL):

```bash
curl -X POST "https://dabbu-server.herokuapp.com/files-api/v3/clients/"
```

Typescript/NodeJS:

```typescript
// Use the axios module to make network requests
import axios from 'axios' // OR const axios = require('axios').default

// Make a POST request to the /clients endpoint
axios({
  method: 'POST',
  baseURL: 'https://dabbu-server.herokuapp.com/files-api/v3/',
  url: '/clients'
}).then((response) => {
  // `response.data` contains the exact server response
  const serverResponse = response.data
  // Dabbu returns all responses in the following format:
  // {
  //   // The http response code
  //   code: 2xx or 4xx or 5xx,
  //   // The error object, present only if an error has occurred
  //   error: {
  //     message: 'user friendly error message',
  //     reason: 'computer friendly reason'
  //   },
  //   // An object or array depending on what you asked for
  //   content: {
  //     // Whatever the response is, present only if there is no error
  //   }
  // }
  // In our case, the content object has an `id` and `apiKey` field.
  const clientId = serverResponse.content.id
  const apiKey = serverResponse.content.apiKey
  // TODO: store the client ID - API key pair safely. Do NOT expose them, 
  // otherwise you will need to revoke them and create a new pair
}).catch((error) => {
  // This callback is called if an error occurs
  // `error.response.data` contains the exact server response
  const serverResponse = error.response.data
  // This time the serverResponse will have an error field instead of 
  // the content field
  const httpErrorCode = serverResponse.code
  // The error message to show the user
  const errorMessage = serverResponse.error.message
  // The error reason that the program can parse and understand what the
  // problem is. For example, if there is a missing parameter, say in
  // the request body, then the server will return an error code 400.
  // The error reason in this case will be `missingParameter`
  const errorReason = serverResponse.error.reason
})
```

Once you have the client ID - API key pair, it's time to make some requests!

-- This doc is a WIP, will be completed before v3 stable release --
