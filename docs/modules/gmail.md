# Dabbu Google Drive Data Provider

To install its dependencies, run:

`npm install axios turndown`

# Provider specific variables

Requires an access token of the format `Bearer <token>` added to the header under the `Authorization` header field in every request. No provider data needs to be added to the request body.

# Gmail specific features

- Labels are treated as folders
- Threads are files
- The thread ID is used to get a thread and all its messages
- When getting a specific thread, the provider will create a zip file containing all messages in the thread, along with any inline images and attachments. The messages will be converted to markdown if in html.
