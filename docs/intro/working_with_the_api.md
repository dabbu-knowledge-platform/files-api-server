---
layout: home
title: Working with the APIs
nav_order: 3
---

# Working with the APIs

## Making an HTTP request to the Dabbu Server

To make a request to the Dabbu Server, you currently have to make a raw HTTP request in your code (for example, using a module like `axios` in NodeJS or `requests` in Python) or by using a tool like `cURL` on the command line or `Postman` in the browser. Client libraries are a work in progress.

Of course, before making the requests, you must [download and run](https://github.com/gamemaker1/dabbu-server/releases/latest) the server executable on your computer.

### Authorization for certain providers

Some providers require authorization, while others don't. For example, Google Drive, One Drive and Gmail require OAuth2 authorization, while the Hard Drive provider does not need any authorization.

If a provider needs authorization, the client application is responsible to gain user consent to access their Google Drive/One Drive/Gmail and obtain an access token and refresh token from the provider. Once the client application gains an access token from the respective provider, they can pass the access token to the server in the 'Authorization' header.

The provider on the server will use this access token to perform the specified operation on the user's files in that drive.

To see an example of how a client could handle authorization (without the upcoming client libraries), take a look at [Dabbu CLI](https://github.com/gamemaker1/dabbu-cli).

### HTTP Methods

Dabbu Server uses the **GET, POST, PUT and DELETE** methods on all resources.

To get an overview of what each does, the input and output, and code examples, take a look at the [HTTP Requests section](../ref/).

### Notes on making HTTP requests

Always ensure that all folder paths are **delimited with a forward slash** and not a back slash.

Always ensure that the provider ID, folder path, file name and query parameters are **URL encoded**.

Always ensure you have **supplied required fields in the request body and request headers** for that particular provider. For example, the Hard Drive requires a field in the request body called `base_path`, containing the path to the folder to treat as root while retrieving a resource. For details on what provider requires what fields/headers, take a look at the [Provider Modules section](../modules/).
