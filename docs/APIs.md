# Dabbu APIs

**This document specifies all the APIs Dabbu currently handles, what parameters the requests take, and the response and error types.**

Please URL encode all params, especially file and folder paths while sending requests. **IMP: The server only works with `/` as a path separator for folder paths, NOT `\`. Please keep this in mind while using these APIs.**

### **List all enabled providers**
#### **GET**: `/providers`
- Request parameters: [None]
- Request body: [Empty]
- Response:
  - `res`: The response body - `obj { code: int32, content: obj { providers: array<string> } }`
- Errors: [None]

### **Check if a provider is enabled**
#### **GET**: `/providers/:providerId`
- Request parameters: [Compulsory]
  - `providerId`: Provider ID - `string`
- Response:
  - Sends back a `200` code if the provider is enabled, else a `503`.
- Errors: [None]
  - `503`: Provider not enabled - (Sends only HTTP code, no response body)

### **List files in a folder**
#### **GET**: `/data/:providerId/:folderPath?compareWith=$compareWith&operator=$operator&value=$value&orderBy=$orderBy&direction=$direction&exportType=$uriType`
- Request parameters: [Compulsory]
  - `providerId`: Provider ID - `string`
  - `folderPath`: Path to folder - `string`
- Query parameters: [Optional]
  - `compareWith`: Compare items by a field (specify field name) - `string`
  - `operator`: Only take items with value equal to, less than or greater than the value specified - `enum<string> - =, <, >`
  - `value`: The value of the field the item must be equal to, less than or greater than - `string`
  - `orderBy`: Order by a field (specify field name) - `string`
  - `direction`: The order in which to sort the items - `enum<string> - asc, desc`
  - `exportType`: Type of URI that the content should be returned in, providers are free to set their own accepted values - `string`
- Request body: [Optional]
  - The request body may contain any fields that the provider requires to execute the request
- Response:
  - `res`: The response body - `obj { code: int32, error: obj { message: string, reason: string }, content: array<files>(obj { name: string, kind: enum<string>(file, folder), path: string, mimeType: string, size: int32, createdAtTime: timestamp, lastModifiedTime: timestamp, content: URI }) }`
- Errors:
  - `400`: Bad URL, invalid syntax for query parameters - `malformedURL`
  - `404`: The folder was not found - `notFound`
  - `500`: Internal server error, used if an uncaught exception appears - `internalServerError`
  - `503`: Provider not available - `providerNotFound`

### **Get a file**
#### **GET**: `/data/:providerId/:folderPath/:fileName?exportType=$uriType`
- Request parameters: [Compulsory]
  - `providerId`: Provider ID - `string`
  - `folderPath`: Path to folder - `string`
  - `fileName`: Name of the file - `string`
- Query parameters: [Optional]
  - `exportType`: Type of URI that the content should be returned in, providers are free to set their own accepted values - `string`
- Request body: [Optional]
  - The request body may contain any fields that the provider requires to execute the request
- Response:
  - `res`: The response body - `obj { code: int32, error: obj { message: string, reason: string }, content: obj { name: string, kind: enum<string>(file, folder), path: string, mimeType: string, size: int32, createdAtTime: timestamp, lastModifiedTime: timestamp, content: URI } }`
- Errors:
  - `404`: The folder was not found - `notFound`
  - `500`: Internal server error, used if an uncaught exception appears - `internalServerError`
  - `503`: Provider not available - `providerNotFound`

### **Upload a file**
#### **POST**: `/data/:providerId/:folderPath/:fileName`
- Request parameters: [Compulsory]
  - `providerId`: Provider ID - `string`
  - `folderPath`: Path to folder - `string`
  - `fileName`: Name of the file - `string`
- Request body: [Compulsory] [Posted as form data]
  - The request body may contain any fields that the provider requires to execute the request
  - `content`: The file content - `file-data`
- Response:
  - `res`: The response body - `obj { code: int32, error: obj { message: string, reason: string }, content: obj { name: string, kind: enum<string>(file, folder), path: string, mimeType: string, size: int32, createdAtTime: timestamp, lastModifiedTime: timestamp, content: URI } }`
- Errors:
  - `409`: The file already exists - `fileExists`
  - `500`: Internal server error, used if an uncaught exception appears - `internalServerError`
  - `503`: Provider not available - `providerNotFound`

### **Update a file**
#### **PUT**: `/data/:providerId/:folderPath/:fileName`
- Request parameters: [Compulsory]
  - `providerId`: Provider ID - `string`
  - `folderPath`: Path to folder - `string`
  - `fileName`: Name of the file - `string`
- Request body: [Compulsory] [Posted as form data]
  - The request body may contain any fields that the provider requires to execute the request
  - `content`: The file content - `file-data`
- Response:
  - `res`: The response body - `obj { code: int32, error: obj { message: string, reason: string }, content: obj { name: string, kind: enum<string>(file, folder), path: string, mimeType: string, size: int32, createdAtTime: timestamp, lastModifiedTime: timestamp, content: URI } }`
- Errors:
  - `404`: The file was not found - `notFound`
  - `500`: Internal server error, used if an uncaught exception appears - `internalServerError`
  - `503`: Provider not available - `providerNotFound`

### **Delete a file**
#### **DELETE**: `/data/:providerId/:folderPath/:fileName?`
- Request parameters: [Compulsory]
  - `providerId`: Provider ID - `string`
  - `folderPath`: Path to folder (If only folder path is given, then the entire folder with its contents will be deleted) - `string`
  - `fileName`: Name of the file - `string` [Optional]
- Request body: [Optional]
  - The request body may contain any fields that the provider requires to execute the request
- Response:
  - `res`: The response body - `obj { code: int32 }`
- Errors:
  - `404`: The file was not found - `notFound`
  - `500`: Internal server error, used if an uncaught exception appears - `internalServerError`
  - `503`: Provider not available - `providerNotFound`
