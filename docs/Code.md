# Dabbu Code Overview

**If you want to contribute new features or fix a bug or make perfomance improvements, please do read through this document to know how the code is structured.**

Note on dependencies: All the dependencies required by Dabbu (and *NOT* the modules that are provided) are listed as production dependencies, while the dependecies/pacakges for all the provider-specific modules are listed as dev dependencies. We request module developers to adhere to this format. To install only the dependencies required for dabbu, run `npm install --production`, and then to install dependencies for each provider separately refer to their documentation. To install a dependency as a dev dependency, use `npm install --save-dev <package-name>`

## **src/server.js**

This will contain most of the server side request handling code. Here is what will happen there:
- Accept and parse input from the user
- Initialise an express server on port given by the user (default: 8080)
- Store a list of enabled providers given by the user (default: all enabled)
- Define listeners for GET, POST, PUT and DELETE requests (there will be two GET requests, one to return a file and one to list files)
- The listeners will load the required module and pass the request headers, body, URL parameters and queries to the respective function of that provider (refer to the provider modules section below)
- The returned promise will be executed and then the result (or error) will be sent back.

## **src/errors.js**

This file contains all custom errors that can be thrown by modules and the middleware. It also contains the custom error handler that the server uses. Each custom error must extend the superclass `GeneralError` and call the super method with a http code, the message parameter passed to it in the constructor and a reason string that describes the http code (reason must be in camel case)

```Javascript
// The General Error class that all custom errors must extend
class GeneralError extends Error {
  constructor(code, message, reason) {
    super();
    this.code = code
    this.message = message
    this.reason = reason
  }
}

// Our custom error
exports.BadRequestError = class BadRequestError extends this.GeneralError {
  constructor(message) {
    super(
      400, // The HTTP error code to send back
      message, // The user-understandable message to send back
      "malformedURL" // The computer friendly message to send back
    )
  }
}
```

## **src/utils.js**

This file contains all utility methods used by the server.

## **src/modules/provider_id.js**

This wil contain the code related to each provider.  Here is what will happen:
- Each provider 'module' **must** extend the `Provider` class and implement at least the following methods:
  - list
  - read
  - create
  - delete
- Each function will be provided the request body (as `providerData`), the request headers (in case there is an Authorization header, etc.), request URL params, query params and files uploaded if required as JSON objects.

A sample provider will be as follows:

```Javascript
// Import the provider class first
const Provider = require("./provider.js").default

// Our custom provider
class CustomProvider extends Provider {
  // Constructor is required. Don't put anything in here, handle everything separately in the functions.
  constructor() {
    super()
  }

  async list(providerData, headers, params, queries) {
    // Custom code custom code ....
  }

  async read(providerData, headers, params, queries) {
    // Custom code custom code ....
  }

  async create(providerData, headers, params, queries, fileMeta) {
    // Custom code custom code ....
  }

  async delete(providerData, headers, params, queries) {
    // Custom code custom code ....
  }
}

// Export it as the default export. Try NOT to export anything else.
exports.default = CustomProvider
```
