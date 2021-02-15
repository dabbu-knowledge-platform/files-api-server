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
const { NotFoundError, NotImplementedError, MissingParamError } = require("../errors.js")
// Used sort the files retrieved based on query parameters
const { sortFiles } = require("../utils.js")

// Import the default Provider class we need to extend
const Provider = require("./provider.js").default

// MARK: Functions

// Our special function to get all the messages in a thread, and their 
// attachments, and send it back as a data: URI 
async function createMailDataURI(instance, threadData) {
  // The text and metadata of all the messages in one long string
  let messagesData = ""
  // The base 64 encoded attachments in the thread
  let attachments = []
  // Loop through the thread for messages
  for (const message of threadData.messages) {
    // Get the message headers
    const headers = message.payload.headers

    // Fetch and write the metadata
    messagesData += [
      "---",
      `subject: ${headers.filter((header) => header.name.toLowerCase() === "subject")[0].value}`, // Message subject
      `date: ${headers.filter((header) => header.name.toLowerCase() === "date")[0].value}`, // Message sent on
      `from: ${headers.filter((header) => header.name.toLowerCase() === "from")[0].value}`, // Message sent from
      `to: ${headers.filter((header) => header.name.toLowerCase() === "to")[0].value}`, // Message sent to
      "--",
      ""
    ].join("\n")

    // Gmail separates the message into parts, loop through them
    for (const part of message.payload.parts) {
      // First check if it is quoted text from a previous message
      const transferEncodingHeader = part.headers.filter((header) => header.name.toLowerCase() === "content-transfer-encoding")
      if (transferEncodingHeader.length > 0 && transferEncodingHeader[0].value === "quoted-printable" && part.mimeType === "text/html") {
        // If so, simply add a "..."
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
    messagesData += "\n\n"
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

    // Folder paths for threads is labels
    const labelID = params["folderPath"] || "INBOX"

    // Get the export type and compare/sort params from the query parameters
    let {compareWith, operator, value, orderBy, direction, exportType} = queries

    // List out all the threads labelled with that particular label
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
      
      // If the thread exists, parse it
      if (threadResult.data && threadResult.data.messages) {
        // Get all its messages
        const messages = threadResult.data.messages
        if (messages.length > 0) {
          // Get the first and last messages
          const firstMessage = messages[0]
          const lastMessage = messages[messages.length - 1]
          let firstHeaders = firstMessage.payload.headers
          let lastHeaders = lastMessage.payload.headers

          // Get the subject from the last email, as that is what is seen in
          // the user's inbox
          let subject = "(Empty Subject)"
          const subjectHeaders = lastHeaders.filter((header) => header.name.toLowerCase() === "subject")
          if (subjectHeaders.length > 0) subject = subjectHeaders[0].value

          // The created at time is when the first message was sent
          let createdAtDate
          const createdAtDateHeaders = firstHeaders.filter((header) => header.name.toLowerCase() === "date")
          if (createdAtDateHeaders.length > 0) createdAtDate = createdAtDateHeaders[0].value

          // The last modified time is when the last message was sent
          // Note: would be more accurate to use internalDate, but that
          // is only returned when retrieving a specific message
          let lastModifiedDate
          const lastModifiedDateHeaders = lastHeaders.filter((header) => header.name.toLowerCase() === "date")
          if (lastModifiedDateHeaders.length > 0) lastModifiedDate = lastModifiedDateHeaders[0].value

          // The content URI
          let contentURI
          if (exportType === "view") {
            // If exportType is view, return a link to view the thread in the inbox
            contentURI = `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}` // View in gmail
          } else {
            // Else return the data URI created specially by Dabbu
            contentURI = await createMailDataURI(instance, threadResult.data)
          }

          // Add this to the results
          results.push({
            name: `${subject} - ${threadResult.data.id}`,
            path: `/${labelID}/${threadResult.data.id}`,
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

    // Sort the results using the sortFile function
    results = sortFiles(compareWith, operator, value, orderBy, direction, results)

    return results
  }

  async read(body, headers, params, queries) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://gmail.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Folder paths for threads is labels
    const labelID = params["folderPath"] || "INBOX"
    // File name is the thread ID
    const threadId = params["fileName"]

    // Get the export type
    const {exportType} = queries

    // Get that particular thread from the Gmail API
    const threadResult = await instance.get(`/gmail/v1/users/me/threads/${threadId}`, {
      params: {
        format: exportType === "view" ? "METADATA" : "FULL"
      }
    })

    // If the thread exists, parse it
    if (threadResult.data && threadResult.data.messages) {
      // Get all its messages
      const messages = threadResult.data.messages
      if (messages.length > 0) {
        // Get the first and last messages
        const firstMessage = messages[0]
        const lastMessage = messages[messages.length - 1]
        let firstHeaders = firstMessage.payload.headers
        let lastHeaders = lastMessage.payload.headers

        // Get the subject from the last email, as that is what is seen in
        // the user's inbox
        let subject = "(Empty Subject)"
        const subjectHeaders = lastHeaders.filter((header) => header.name.toLowerCase() === "subject")
        if (subjectHeaders.length > 0) subject = subjectHeaders[0].value

        // The created at time is when the first message was sent
        let createdAtDate
        const createdAtDateHeaders = firstHeaders.filter((header) => header.name.toLowerCase() === "date")
        if (createdAtDateHeaders.length > 0) createdAtDate = createdAtDateHeaders[0].value

        // The last modified time is when the last message was sent
        // Note: would be more accurate to use internalDate, but that
        // is only returned when retrieving a specific message
        let lastModifiedDate
        const lastModifiedDateHeaders = lastHeaders.filter((header) => header.name.toLowerCase() === "date")
        if (lastModifiedDateHeaders.length > 0) lastModifiedDate = lastModifiedDateHeaders[0].value

        // The content URI
        let contentURI
        if (exportType === "view") {
          // If exportType is view, return a link to view the thread in the inbox
          contentURI = `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}` // View in gmail
        } else {
          // Else return the data URI created specially by Dabbu
          contentURI = await createMailDataURI(instance, threadResult.data)
        }

        // Add this to the results
        return {
          name: `${subject} - ${threadId}`,
          path: `/${labelID}/${threadId}`,
          kind: "file", // An entire thread can be viewed at once. Labels are folders, not threads
          mimeType: "mail/thread", // Weird mime type invented by me TODO: replace this with a proper one
          size: NaN, // We have size of messages+attachments, not threads
          createdAtTime: new Date(createdAtDate).toISOString(), // When the first message was sent
          lastModifiedTime: new Date(lastModifiedDate).toISOString(), // When the last message was sent
          contentURI: contentURI // Content URI
        }
      }
    } else {
      throw new NotFoundError(`Coudn't find thread with ID ${threadId}`)
    }
  }

  async create(body, headers, params, queries, fileMeta) {
    throw new NotImplementedError("Dabbu's Gmail provider does not support the create method")
  }

  async update(body, headers, params, queries, fileMeta) {
    throw new NotImplementedError("Dabbu's Gmail provider does not support the update method")
  }

  async delete(body, headers, params, queries) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://gmail.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Folder paths for threads is labels
    const labelID = params["folderPath"] || "INBOX"
    // File name is the thread ID
    const threadId = params["fileName"]

    // Check if there is a thread ID (in delete, file name is optional,
    // but in Gmail, we can't delete a label)
    if (!threadId) {
      throw new MissingParamError("Missing thread ID")
    }

    // Trash the thread, don't delete it permanently
    return await instance.post(`/gmail/v1/users/me/threads/${threadId}/trash`)
  }
}

// MARK: Export

// Export the Provider class as the default export
exports.default = GmailProvider