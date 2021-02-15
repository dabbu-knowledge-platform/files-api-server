/* Dabbu Server - a unified API to retrieve your files and folders stored online
 * Copyright (C) 2021  gamemaker1
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// MARK: Imports

// Used to make HTTP request to the Google Drive API endpoints
const axios = require("axios")

// Custom errors we throw
const { NotFoundError, BadRequestError, FileExistsError, GeneralError } = require("../errors.js")
// Used to generate platform-independent file/folder paths
const { diskPath, sortFiles } = require("../utils.js")

// Import the default Provider class we need to extend
const Provider = require("./provider.js").default

// MARK: Functions

async function createMailDataURI(instance, threadData) {
  let messagesData = ""
  let attachments = []
  for (const message of threadData.messages) {
    const headers = message.payload.headers

    // Fetch and write the metadata
    messagesData += [
      "---",
      `subject: ${headers.filter((header) => header.name.toLowerCase() === "subject")[0].value}`,
      `date: ${headers.filter((header) => header.name.toLowerCase() === "date")[0].value}`,
      `from: ${headers.filter((header) => header.name.toLowerCase() === "from")[0].value}`,
      `to: ${headers.filter((header) => header.name.toLowerCase() === "to")[0].value}`,
      "---",
      ""
    ].join("\n")

    // Gmail separates the message into parts
    for (const part of message.payload.parts) {
      // First check if it is quoted text from a previous message
      const transferEncodingHeader = part.headers.filter((header) => header.name.toLowerCase() === "content-transfer-encoding")
      if (transferEncodingHeader.length > 0 && transferEncodingHeader[0].value === "quoted-printable" && part.mimeType === "text/html") {
        messagesData += "..."
      } else {
        // Else if it is text, print it out
        if (part.mimeType === "text/plain" || part.mimeType === "text/html") {
          messagesData += Buffer.from(part.body.data, 'base64').toString('ascii')
        } else {
          // Else it is an attachment
          // Check if this part is announcing the attachment or is the attachment
          if (part.mimeType !== "multipart/alternative") {
            // If it is an attachment, fetch it and store it
            messagesData += [
              "Attachment found:",
              `- name: ${part.filename}`,
              `- size: ${part.body.size} bytes`,
              `- type: ${part.mimeType}`
            ].join("\n")

            const attachmentId = part.body.attachmentId
            // Surround in try-catch block as we don't want one failed result to kill
            // the entire operation
            try {
              // Get the attachment as a base64 encoded string
              const attachmentResult = await instance.get(`/gmail/v1/users/me/messages/${message.id}/attachments/${attachmentId}`)
              if (attachmentResult.data && attachmentResult.data.data) {
                // Add it to the attachments array as is, let the clients decode it
                attachments.push(attachmentResult.data.data)
              } else {
                // No data
                messagesData += "Failed to fetch attachment"
              }
            } catch (err) {
              // Some weird error occurred, tell the user
              messagesData += `Failed to fetch attachment: ${err.message}`
            }
          }
          // Else we are announcing, skip it
        }
      }
    }
    
    // Line break between two messages
    messagesData += "\n\n=====\n"
  }

  // Create a JSON object and return it as a data: URI
  const threadObj = {
    messages: Buffer.from(messagesData).toString('base64'),
    attachments: attachments
  }

  return `data:application/json,${JSON.stringify(threadObj)}`
}

// MARK: Provider

class GmailProvider extends Provider {
  constructor() {
    super()
  }

  async list(body, headers, params, queries) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://gmail.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Folder paths for list is labels
    const labelID = params["folderPath"] || "INBOX"

    // Ignore the query params except for export type
    const {exportType} = queries

    // List out all the threads in their inbox only
    const threadsResult = await instance.get(`/gmail/v1/users/me/threads?labelIds=${labelID}`)

    // Hold the results here
    let results = []
    for (let thread of threadsResult.data.threads) {
      // Get the headers of each thread's messages
      // If the export type is view, get only the metadata, else get everything
      const threadResult = await instance.get(`/gmail/v1/users/me/threads/${thread.id}`, {
        params: {
          format: exportType === "view" ? "METADATA" : "FULL"
        }
      })
      if (threadResult.data && threadResult.data.messages) {
        const messages = threadResult.data.messages
        if (messages.length > 0) {
          const firstMessage = messages[0]
          const lastMessage = messages[messages.length - 1]
          let firstHeaders = firstMessage.payload.headers
          let lastHeaders = lastMessage.payload.headers

          const subject = lastHeaders.filter((header) => header.name.toLowerCase() === "subject")[0].value
          const createdAtDate = firstHeaders.filter((header) => header.name.toLowerCase() === "date")[0].value
          const lastModifiedDate = lastHeaders.filter((header) => header.name.toLowerCase() === "date")[0].value
          let contentURI
          if (exportType === "view") {
            contentURI = `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}` // View in gmail
          } else {
            contentURI = await createMailDataURI(instance, threadResult.data)
          }

          results.push({
            name: `${threadResult.data.id}: ${subject}`,
            path: labelID,
            kind: "file", // An entire thread can be viewed at once. Labels are folders, not threads
            mimeType: "mail/thread", // Weird mime type invented by me TODO: replace this with a proper one
            size: NaN, // We have size of messages+attachments, not threads
            createdAtTime: new Date(createdAtDate).toISOString(), // When the first message was sent
            lastModifiedTime: new Date(lastModifiedDate).toISOString(), // When the last message was sent
            contentURI: contentURI // Content URI
          })
        }
      }
    }

    return results
  }

  async read(body, headers, params, queries) {
    // TODO: Folder paths for read is thread ID
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://gmail.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Folder path is to be ignored, file name is the thread ID
    const threadID = params["fileName"]

    // Ignore the query params except for export type
    const {exportType} = queries

    // List out all the threads in their inbox only
    const threadsResult = await instance.get(`/gmail/v1/users/me/threads/${thread.id}`)

    // Hold the results here
    let results = []
    for (let thread of threadsResult.data.threads) {
      // Get the headers of each thread's messages
      // We don't want to get the message body
      const threadResult = await instance.get(`/gmail/v1/users/me/threads/${thread.id}?format=METADATA`, {
        params: {
          format: exportType === "view" ? "METADATA" : "FULL"
        }
      })
      if (threadResult.data && threadResult.data.messages) {
        const messages = threadResult.data.messages
        if (messages.length > 0) {
          const firstMessage = messages[0]
          const lastMessage = messages[messages.length - 1]
          let firstHeaders = firstMessage.payload.headers
          let lastHeaders = lastMessage.payload.headers

          const subject = lastHeaders.filter((header) => header.name.toLowerCase() === "subject")[0].value
          const createdAtDate = firstHeaders.filter((header) => header.name.toLowerCase() === "date")[0].value
          const lastModifiedDate = lastHeaders.filter((header) => header.name.toLowerCase() === "date")[0].value
          let contentURI
          if (exportType === "view") {
            contentURI = `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}` // View in gmail
          } else {
            contentURI = await createMailDataURI(instance, threadResult.data)
          }

          return {
            name: `${threadResult.data.id}: ${subject}`,
            path: labelID,
            kind: "file", // An entire thread can be viewed at once. Labels are folders, not threads
            mimeType: "mail/thread", // Weird mime type invented by me TODO: replace this with a proper one
            size: NaN, // We have size of messages+attachments, not threads
            createdAtTime: new Date(createdAtDate).toISOString(), // When the first message was sent
            lastModifiedTime: new Date(lastModifiedDate).toISOString(), // When the last message was sent
            contentURI: contentURI // Data URI of the generated file containing all emails in the thread
          }
        }
      }
    }

    return results
  }

  async create(body, headers, params, queries, fileMeta) {
  }

  async update(body, headers, params, queries, fileMeta) {
  }

  async delete(body, headers, params, queries) {
  }
}

// MARK: Export

// Export the Provider class as the default export
exports.default = GmailProvider