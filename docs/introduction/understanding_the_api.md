---
layout: home
nav_order: 2
---

# Understanding the APIs

## What is an API

An API is a set of rules that allow programs/applications to talk to each other, **asking for and returning data in a uniform format**.

REST APIs usually refers to APIs accessible over HTTP/HTTPS.

These URLs represent various resources that exist at that particular location (in our case, **files and folders**) which can be returned in any format (usually [JSON](https://en.wikipedia.org/wiki/JSON)/[XML](https://en.wikipedia.org/wiki/XML)). To interact with the resources, there exist various _'verbs'_ or _actions_ you can perform on the resources over HTTP such as **GET, POST, PUT and DELETE.**

Dabbu 'exposes' a REST API to interact with your files and folders from multiple providers and get them in a single format. You can access these files using **simple HTTP requests.**

## Resources in Dabbu

In Dabbu, all resources are either files or folders. These resources are represented as **JSON objects**. For example, the following is a representation of a document named 'API.txt' in the 'Downloads' folder in my Google Drive:

```json
{
  "name": "API.txt", // The name of the resource
  "kind": "file", // The type of resource (file/folder/other)
  "provider": "google_drive", // The provider where the resource is
  "path": "/Downloads/API.txt", // The path to the resource within that provider
  "mimeType": "text/plain", // The mime type of the file's contents
  "size": 42, // The size in bytes
  "createdAtTime": "2021-06-07T07:06:42Z", // The time the file was created
  "lastModifiedTime": "2021-06-07T07:06:42Z", // The time the file was last modified (not accessed)
  "contentURI": "https://www.googleapis.com/files/KLJSF239iDS_ad839LSDJFl?alt=media&source=downloadUrl" // The content URI to view/download the file
}
```

## Supported HTTP methods

There are several actions you can perform on resources by making HTTP requests to the API. Dabbu allows you to perform the following actions:

- list files and folders in a folder of a provider [GET]
- get information about a particular file at a certain path [GET]
- create a file at a certain path [POST]
- update the metadata and/or contents of a file at a certain path [PUT]
- delete a file or folder at a certain path [DELETE]

Read on to try out the APIs yourself! [>>](./working_with_the_api)
