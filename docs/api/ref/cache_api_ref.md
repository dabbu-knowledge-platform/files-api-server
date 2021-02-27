---
layout: home
title: Getting a file from cache (INTERNAL)
nav_order: 12
parent: HTTP Requests
---

# Getting a file from cache (INTERNAL)

**GET**: `/cache/:filePath`

- Request parameters: [Compulsory]

  - `filePath`: Path to the file - `string`

- Request body: [Empty]

- Response:

  - Readable stream of file contents

- Errors:
  - `400`: The file path was incorrect - `malformedUrl`
  - `404`: The file was not found - `notFound`
  - `500`: Internal server error, used if an uncaught exception appears - `internalServerError`

**To be used only by provider modules that process file content and deliver it in a different format. For example, the [Gmail provider module](../modules/gmail) converts a thread into a zip file containing messages and attachments and stores it in cache. To allow clients to retrieve it, it creates a URI with the file path within the cache folder.**
