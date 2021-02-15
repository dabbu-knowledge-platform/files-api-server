# Dabbu Google Drive Data Provider

To install its dependencies, run: 

`npm install axios`

# Provider specific variables

Requires an access token of the format `Bearer <token>` added to the header under the `Authorization` header field in every request. No provider data needs to be added to the request body.

# Gmail specific features

- Labels are treated as folders
- Threads are files
- The thread ID is used to get a thread and all its messages
- When getting a specific thread, the provider will create a nicely formatted string with all the messages in it. Then it will return the string of messages as well as any attachments as a data: URI in application/json format:
{
  messages: "base64 encoded generated file",
  attachments: [
    "base64 encoded attachment 1",
    "base64 encoded attachment 2",
    "base64 encoded attachment 3",
    ...
  ]
}