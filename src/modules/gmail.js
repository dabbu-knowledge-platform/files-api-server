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

// Used to store the files generated from a thread
const fs = require("fs-extra")
// Used to make HTTP request to the Google Drive API endpoints
const axios = require("axios")
// Used to detect mime types based on file content
const fileTypes = require("file-type")
// Used to bundle threads with attachments into zips
const archiver = require("archiver")

// To convert html to markdown
const TurndownService = require("turndown")
const turndownService = new TurndownService()

// Custom errors we throw
const { NotFoundError, NotImplementedError, MissingParamError } = require("../errors.js")
// Used sort the files retrieved based on query parameters
const { sortFiles, diskPath } = require("../utils.js")

// Import the default Provider class we need to extend
const Provider = require("./provider.js").default

// MARK: Functions

// Get the thread ID from a file name (the file names are in 
// the format `{date} - {threadID} - {subject}`)
function getThreadIDFromName(name) {
  const splitName = name.split("-")
  if (splitName.length === 1) return name
  if (splitName.length >= 2) return splitName[1].trim()
}

// Get a label from a folder path
async function getLabelsFromName(instance, name) {
  if (name.toLowerCase() == "null" || name.toLowerCase() == "/") {
    return null
  } else {
    // Loop through space separated labels
    const labelNames = name.replace(/\//g, "").split(" ")
    let labels = []

    const labelsResult = await instance.get(`/gmail/v1/users/me/labels`)
    for (let i = 0, length = labelNames.length; i < length; i++) {
      const labelName = labelNames[i]
      // If there is a result, parse it
      if (labelsResult.data && labelsResult.data.labels) {
        // Loop through the labels
        for (const label of labelsResult.data.labels) {
          if (label.name === labelName) {
            labels.push(label.id)
          }
        }
      }
    }

    return labels
  }
}

// Format a date to YYYYMMDD
function formatDate(unformattedDate) {
  let date = new Date(unformattedDate)
  let month = `${(date.getMonth() + 1)}`
  let day = `${date.getDate()}`
  let year = `${date.getFullYear()}`

  if (month.length < 2) 
    month = `0${month}`
  if (day.length < 2)
    day = `0${day}`

  return `${year}${month}${day}`
}

// Our special function to get all the messages in a thread, and their 
// attachments, and send back a download URL
async function createMailDataURI(instance, threadData) {
  // The text and metadata of all the messages in one long string
  let messagesData = ""
  // The base 64 encoded attachments in the thread
  let attachments = []
  // The subject of the last message
  let subject = "(No subject)"
  // The date, sender and recipients of the last message
  let date, from, to
  // Loop through the thread for messages
  for (const message of threadData.messages) {
    // Get the message headers
    const headers = message.payload.headers

    subject = headers.filter((header) => header.name.toLowerCase() === "subject")[0].value
    date = headers.filter((header) => header.name.toLowerCase() === "date")[0].value
    from = headers.filter((header) => header.name.toLowerCase() === "from")[0].value
    to = headers.filter((header) => header.name.toLowerCase() === "to")[0].value

    // Fetch and write the metadata
    messagesData += [
      "---",
      `subject: ${subject}`, // Message subject
      `date: ${date}`, // Message sent on
      `from: ${from}`, // Message sent from
      `to: ${to}`, // Message sent to
      "--",
      ""
    ].join("\n")

    // Gmail either separates the message into parts or puts everything into
    // the body
    // Check if there are parts (usually this is the way messages are sent)
    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        // First check if it is quoted text from a previous message
        const transferEncodingHeader = part.headers.filter((header) => header.name.toLowerCase() === "content-transfer-encoding")
        if (transferEncodingHeader.length > 0 && transferEncodingHeader[0].value === "quoted-printable" && part.mimeType === "text/html") {
          // If so, simply add a "..."
          messagesData += "..."
        } else {
          // Else if it is text, print it out
          if (part.mimeType === "text/plain") {
            messagesData += Buffer.from(part.body.data, 'base64').toString('ascii')
          } else if (part.mimeType === "text/html") {
            // Convert html to markdown
            let html = Buffer.from(part.body.data, 'base64').toString('ascii')
            messagesData += turndownService.turndown(html)
          } else {
            // Else it is an attachment
            // Check if this part is announcing the attachment or is the attachment
            if (part.mimeType !== "multipart/alternative") {
              // If it is an attachment, fetch it and store it
              messagesData += [
                "Attachment found:",
                `- name: ${part.filename}`,
                `- size: ${part.body.size} bytes`,
                `- type: ${part.mimeType}`,
                ""
              ].join("\n")
  
              const attachmentId = part.body.attachmentId
              // Surround in try-catch block as we don't want one failed result to kill
              // the entire operation
              try {
                // Get the attachment as a base64 encoded string
                const attachmentResult = await instance.get(`/gmail/v1/users/me/messages/${message.id}/attachments/${attachmentId}`)
                if (attachmentResult.data && attachmentResult.data.data) {
                  // Add it to the attachments array as is, let the clients decode it
                  attachments.push({
                    fileName: part.filename,
                    data: Buffer.from(attachmentResult.data.data, 'base64')
                  })
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
    } else if (message.payload.body) {
      // If there is a body, attach that instead
      // Convert the html to markdown
      const html = Buffer.from(message.payload.body.data, 'base64').toString('ascii')
      messagesData += turndownService.turndown(html)
    } else {
      messagesData += "Error: couldn't parse the email body"
    }
    
    // Line break between two messages
    messagesData += "\n\n"
  }

  // The output file name
  const fileName = `${formatDate(date)} - ${threadData.id} - ${subject || "(No subject)"}`

  // Pack it all in a zip file
  const output = fs.createWriteStream(`./.cache/${fileName}.zip`)
  const archive = archiver("zip", {
    zlib: { level: 9 } // Sets the compression level.
  })

  // Now append files to the archive
  // First add the message data itself
  archive.append(messagesData, { name: `${fileName} - Messages.md` })

  // Then append the attachments, if any
  for (let j = 0, length = attachments.length; j < length; j++) {
    const attachment = attachments[j]
    const attachmentName = attachment.fileName
    const attachmentData = attachment.data
    const ext = (await fileTypes.fromBuffer(attachmentData) || {}).ext // The extension of the file
    archive.append(attachmentData, { name: `${fileName} - ${attachmentName}${attachmentName.includes(ext) ? "" : ext}` })
  }

  return await new Promise((resolve, reject) => {
    // Once the file is written, return
    output.on("close", () => {
      resolve(`http://localhost:${process.argv.slice(2)[1] || 8080}/dabbu/v1/api/cache/${encodeURIComponent(fileName)}.zip`)
    })

    // Catch errors
    archive.on("error", (err) => {
      throw err
    })

    // Finalize the contents
    archive.finalize()

    // Pipe archive data to the file
    archive.pipe(output)
  })
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

    // Folder path for threads are treated as space separated labels
    const labelIds = await getLabelsFromName(instance, params["folderPath"])

    // Get the export type and compare/sort params from the query parameters
    let {compareWith, operator, value, orderBy, direction, exportType} = queries

    // If the request is for / (the root folder), then return a list
    // of all labels. Else return the list of threads with that label
    let results = []
    if (labelIds) {
      // List out all the threads labelled with that particular label
      let allThreads = []
      let nextPageToken = null
      do {
        const listResult = await instance.get("/gmail/v1/users/me/threads/", {
          params: {
            labelIds: labelIds.join(" "),
            pageToken: nextPageToken
          }
        })
        
        // Get the next page token (incase Google Drive returned incomplete results)
        nextPageToken = listResult.data.nextPageToken

        // Add the files we got right now to the main list
        if (listResult.data.threads) {
          allThreads = allThreads.concat(listResult.data.threads)
        }
      } while (nextPageToken) // Keep doing the above list request until there is no nextPageToken returned

      // Loop through the threads
      if (allThreads.length > 0) {
        for (let thread of allThreads) {
          // If the export type is view, get only the metadata, else get everything
          const threadResult = await instance.get(`/gmail/v1/users/me/threads/${thread.id}`, {
            params: {
              format: "METADATA"
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
              // Get the headers of the messages
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
              let contentURI = `https://mail.google.com/mail/u/0/#inbox/${threadResult.data.id}` // View in gmail
  
              // Add this to the results
              results.push({
                name: `${formatDate(lastModifiedDate)} - ${threadResult.data.id} - ${subject || "(No subject)"}`,
                path: diskPath(params["folderPath"], `${formatDate(lastModifiedDate)} - ${threadResult.data.id} - ${subject || "(No subject)"}`),
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
      } else {
        return []
      }
    } else {
      // Return all the labels the user or Gmail has created
      const labelsResult = await instance.get(`/gmail/v1/users/me/labels`)

      // If there is a result, parse it
      if (labelsResult.data && labelsResult.data.labels) {
        // Loop through the labels
        for (const label of labelsResult.data.labels) {
          // Get detailed info about the label
          const labelInfo = await await instance.get(`/gmail/v1/users/me/labels/${label.id}`)
          results.push({
            name: `${label.name}`,
            path: `/${label.name}`,
            kind: "folder", // Labels are folders, threads are files within them
            mimeType: "mail/label", // Weird mime type invented by me TODO: replace this with a proper one
            size: labelInfo.messagesTotal, // Number of messages with that label
            createdAtTime: NaN, // No such thing as when the label was created
            lastModifiedTime: NaN, // Or when it was last modified
            contentURI: `https://mail.google.com/mail/u/0/#search/label%3A${(label.name || "").replace(/\ /g, "%2F")}` // Content URI
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

    // File name is the thread ID
    const threadId = getThreadIDFromName(params["fileName"])

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
        // Get the headers for the messages
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
          name: `${formatDate(lastModifiedDate)} - ${threadId} - ${subject || "(No subject)"}`,
          path: diskPath(params["folderPath"], `${formatDate(lastModifiedDate)} - ${threadResult.data.id} - ${subject || "(No subject)"}`),
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

  // Ideally, the create method would create a new thread, while the update
  // method would reply to a thread. This would have been possible except
  // for the fact that an email must be sent to another person (person's 
  // email address). The addition of this field, as well as (possibly) a 
  // "reply to email address" would make it difficult to fit it within the
  // file and folder paradigm with the current design we have, as it does
  // not take into account multiple people (another thing that is hit by
  // this shortcoming is shared files - though you might be able to view
  // them, you can't create shared files or share existing ones). If and 
  // when the API supports people as another type of object along with files
  // and folders, this feature (creating and replying to threads) stands 
  // as one of the first to be added.

  async create(body, headers, params, queries, fileMeta) {
    throw new NotImplementedError("Dabbu's Gmail provider currently does not support the create method")
  }

  async update(body, headers, params, queries, fileMeta) {
    throw new NotImplementedError("Dabbu's Gmail provider currently does not support the update method")
  }

  // Trash a thread
  async delete(body, headers, params, queries) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://gmail.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // File name is the thread ID, we don't care about the folder
    const threadId = getThreadIDFromName(params["fileName"])

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