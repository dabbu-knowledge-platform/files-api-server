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

// Files library, used to do all file operations across platforms
const fs = require("fs-extra")
// Used to detect mime types based on file content
const fileTypes = require("file-type")
// Used to make HTTP request to the Google Drive API endpoints
const axios = require("axios")

// Custom errors we throw
const { NotFoundError, BadRequestError, FileExistsError, GeneralError } = require("../errors.js")
// Used to generate platform-independent file/folder paths
const { diskPath, sortFiles, log, json } = require("../utils.js")

// Import the default Provider class we need to extend
const Provider = require("./provider.js").default

// MARK: Functions

// Get the folder ID based on its name
async function getFolderId(instance, folderName, parentId = "root", isShared = false, insertIfNotFound = false) {
  // Log it
  log("google_drive", `Parsing ID from folder name => ${folderName}; parentId => ${parentId}; shared => ${isShared}`)
  // If it's the root folder, return `root` as the ID
  if (folderName === "/") {
    // Log it
    log("google_drive", `Folder ID => root`)
    return "root"
  }

  // Query the Drive API
  // Log it
  log("google_drive", `Fetching folders with name => ${folderName}`)
  const result = await instance.get("/drive/v2/files", {
    params: {
      q: isShared
          ? `title='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed = false and sharedWithMe = true`
          : `'${parentId}' in parents and title='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed = false`,
      fields: `items(id, title)`
    }
  })

  if (result.data.items.length > 0) {
    // Log it
    log("google_drive", `Folder ID => ${result.data.items[0].id}`)
    // If there is a valid result, return the folder ID
    const folderId = result.data.items[0].id
    return folderId
  } else {
    // Log it
    log("google_drive", `Folder was not found`)
    // There is no such folder
    if (insertIfNotFound) {
      // Log it
      log("google_drive", `Inserting new folder`)
      // Insert a folder if the `insertIfNotFound` option is true
      const newFolderResult = await instance.post("/drive/v2/files", {
        "title": folderName,
        parents: [{id: parentId}],
        mimeType: "application/vnd.google-apps.folder"
      })

      if (newFolderResult.data && newFolderResult.data.id) {
        // Log it
        log("google_drive", `Created folder with ID => ${newFolderResult.data.id}`)
        return newFolderResult.data.id
      } else {
        throw new GeneralError(500, "No response from Google Drive. Could not create folder.", "invalidResponse")
      }
    } else {
      // Else error out
      throw new NotFoundError(`Folder ${folderName} does not exist`)
    }
  }
}

// Get the folder ID of the last folder in the path
async function getFolderWithParents(instance, folderPath, isShared = false, insertIfNotFound = false) {
  // Log it
  log("google_drive", `Parsing folder ID from folder path => ${folderPath}; shared => ${isShared}`)
  // If it's the root folder, return `root` as the ID
  if (folderPath === "/") {
    // Log it
    log("google_drive", `Folder ID => root`)
    return "root"
  }

  // Else sanitise the folder path by removing empty names
  const folderNames = folderPath.split("/")
  let i = 0
  while (i < folderNames.length) {
    if (folderNames[i] === "") {
      folderNames.splice(i, 1)
    }
    i++
  }

  // Log it
  log("google_drive", `Folder path => ${folderNames}`)

  if (folderNames.length > 1) {
    // If the path has multiple folders, loop through them, get their IDs and 
    // then get the next folder ID with it as a parent
    let prevFolderId = "root"
    // Log it
    log("google_drive", `Looping through folder heirarchy`)
    for (let j = 0, length = folderNames.length; j < length; j++) {
      // Log it
      log("google_drive", `Current folder => ${folderNames[j]}`)
      // Don't set sharedWithMe here to true if this is not the first folder, 
      // because then the folder is implicitly shared as part of the first folder
      prevFolderId = await getFolderId(instance, folderNames[j], prevFolderId, isShared && j === 0, insertIfNotFound)
    }
    // Log it
    log("google_drive", `Folder ID (nested) => ${prevFolderId}`)
    // Return the ID of the last folder
    return prevFolderId
  } else {
    // Return the last and only folder's ID
    // Set sharedWithMe here to true (if passed on as true) as the 
    // folder will have been explicitly shared
    const folderId = await getFolderId(instance, folderNames[folderNames.length - 1], "root", isShared, insertIfNotFound)
    // Log it
    log("google_drive", `Folder ID (below root) => ${folderId}`)
    return folderId
  }
}

// Get the ID of a file based on its name
async function getFileId(instance, fileName, parentId = "root", isShared = false, errorOutIfExists = false) {
  // Log it
  log("google_drive", `Fetching files with name => ${fileName}; parentId => ${parentId}; shared => ${isShared}`)
  // Query the Drive API
  const result = await instance.get("/drive/v2/files", {
    params: {
      q: isShared 
        ? `title='${fileName}' and sharedWithMe = true and trashed = false`
        : `'${parentId}' in parents and title = '${fileName}' and trashed = false`,
      fields: `items(id, title)`
    }
  })
  
  if (result.data.items.length > 0) {
    // Log it
    log("google_drive", `Received ${result.data.items.length} result(s)`)
    // If there is a valid result:
    if (errorOutIfExists) {
      // If the `errorOutIfExists` option is true (used when creating a file), error out
      throw new FileExistsError(`File ${fileName} already exists`)
    } else {
      // Else return the file ID
      const fileId = result.data.items[0].id
      // Log it
      log("google_drive", `File ID => ${fileId}`)
      return fileId
    }
  } else {
    // File doesn't exist
    if (!errorOutIfExists) {
      // If the `errorOutIfExists` option is false (used when creating a file), error out
      throw new NotFoundError(`File ${fileName} does not exist`)
    } else {
      // Log it
      log("google_drive", `File doesn't exist (with name => ${fileName})`)
    }
  }
}

// Get the file ID of a file with a folder path before it
async function getFileWithParents(instance, filePath, isShared = false) {
  // Log it
  log("google_drive", `Parsing file ID from file path => ${filePath}; shared = ${isShared}`)
  // Parse the path
  let folderNames = filePath.split("/")
  // Get the file name and remove it from the folder path
  const fileName = folderNames.pop()

  // Sanitize the folder names by removing empty folder namess
  let i = 0
  while (i < folderNames.length) {
    if (folderNames[i] === "") {
      folderNames.splice(i, 1)
    }
    i++
  }

  // Log it
  log("google_drive", `Folder names => ${folderNames}; file name => ${fileName}`)

  if (folderNames.length > 0) {
    // If the path has multiple folders, loop through them, get their IDs and 
    // then get the next folder ID with it as a parent
    let prevFolderId = "root"
    // Log it
    log("google_drive", `Looping through folder heirarchy`)
    for (let j = 0, length = folderNames.length; j < length; j++) {
      // Don't set sharedWithMe here to true if this is not the first folder, 
      // because then the folder is implicitly shared as part of the first folder
      // Log it
      log("google_drive", `Current folder => ${prevFolderId}`)
      prevFolderId = await getFolderId(instance, folderNames[j], prevFolderId, isShared && j === 0)
    }
    // Log it
    log("google_drive", `Final folder ID => ${prevFolderId}`)
    // Return the file ID with the parent ID being the last folder's ID
    // Don't set sharedWithMe here to true, because the file is implicitly
    // shared as part of a main folder
    const fileId = await getFileId(instance, fileName, prevFolderId)
    // Log it
    log("google_drive", `File ID (nested) => ${fileId}`)
    // Return the file ID
    return fileId
  } else {
    // Get the file ID
    // Set sharedWithMe here to true (if passed on as true) as the 
    // file will have been explicitly shared
    const fileId = await getFileId(instance, fileName, "root", isShared)
    // Log it
    log("google_drive", `File ID (below root) => ${fileId}`)
    // Return the file ID
    return fileId
  }
}

// Get a valid mime type to export the file to for certain Google Workspace files
function getExportTypeForDoc(fileMimeType) {
  // Google Docs ---> Microsoft Word (docx)
  if (fileMimeType === "application/vnd.google-apps.document") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
  // Google Sheets ---> Microsoft Excel (xlsx)
  if (fileMimeType === "application/vnd.google-apps.spreadsheet") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }
  // Google Slides ---> Microsoft Power Point (pptx)
  if (fileMimeType === "application/vnd.google-apps.presentation") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  }
  // Google Drawing ---> PNG Image (png)
  if (fileMimeType === "application/vnd.google-apps.drawing") {
    return "image/png"
  }
  // Google App Script ---> JSON (json)
  if (fileMimeType === "application/vnd.google-apps.script+json") {
    return "application/json"
  }
  // Google Maps and other types are not yet supported, as they can't
  // be converted to something else yet
  return "auto"
}

// Get a valid mime type to import the file to for certain MS Office files
function getImportTypeForDoc(fileMimeType) {
  // Microsoft Word (docx) ---> Google Docs
  if (fileMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "application/vnd.google-apps.document"
  }
  // Microsoft Excel (xlsx) ---> Google Sheets
  if (fileMimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return "application/vnd.google-apps.spreadsheet"
  }
  // Microsoft Power Point (pptx) ---> Google Slides
  if (fileMimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return "application/vnd.google-apps.presentation"
  }
  // Else return auto
  return "auto"
}

// MARK: GoogleDriveDataProvider

class GoogleDriveDataProvider extends Provider {
  constructor() {
    super()
  }

  // List files and folders at a particular location
  async list(body, headers, params, queries) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://www.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Is the file shared (explicitly or implicitly)
    const isShared = diskPath(params["folderPath"]).startsWith("/Shared") || diskPath(params["folderPath"]).startsWith("Shared")
    // Get the folder path from the URL and replace the /Shared part if it is in the beginning
    const folderPath = diskPath(isShared ? params["folderPath"].replace("Shared", "") : params["folderPath"])
    // Get the export type and compare/sort params from the query parameters
    let {compareWith, operator, value, orderBy, direction, exportType} = queries

    // Log it
    log("google_drive", `Folder path => ${folderPath}; shared => ${isShared}; queries => ${json(queries, true)}`)

    // Don't allow relative paths, let clients do th
    if (folderPath.indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Get the folder ID (exception is if the folder is shared)
    const folderId = await getFolderWithParents(instance, folderPath, isShared)

    // Construct the query
    let q
    if (diskPath(params["folderPath"]) === "/Shared") {
      // If the folder path is /Shared, return all the files in the Shared Folder.
      q = `trashed = false and sharedWithMe = true`
    } else {
      // Else just do a normal list
      q = `'${folderId}' in parents and trashed = false`
    }

    // Log it
    log("google_drive", `Runnning GET request on files matching query => ${q}`)

    // Query the Drive API
    let allFiles = []
    let nextPageToken = null
    do {
      // List all files that match the given query
      // Log it
      log("google_drive", `Running request`)
      log("google_drive", `Page token => ${nextPageToken}`)
      const listResult = await instance.get("/drive/v2/files", {
        params: {
          q: q,
          fields: `nextPageToken, items(id, title, mimeType, fileSize, createdDate, modifiedDate, webContentLink, exportLinks)`,
          pageSize: 100, // Get a max of 100 files at a time
          pageToken: nextPageToken // Add the page token if there is any
        }
      })
      
      // Get the next page token (incase Google Drive returned incomplete results)
      nextPageToken = listResult.data.nextPageToken

      // Add the files we got right now to the main list
      if (listResult.data.items) {
        // Log it
        log("google_drive", `Received files => ${listResult.data.items.map(file => file.title)}`)
        allFiles = allFiles.concat(listResult.data.items)
      }
    } while (nextPageToken) // Keep doing the above list request until there is no nextPageToken returned

    // Once we get everything, parse and print the files
    if (allFiles.length > 0) {
      // Log it
      log("google_drive", `Received ${allFiles.length} files`)
      // If a valid result is returned, loop through all the files and folders there
      let fileObjs = []
      for (let i = 0, length = allFiles.length; i < length; i++) {
        const fileObj = allFiles[i]
        const name = fileObj.title // Name of the file
        const kind = fileObj.mimeType == "application/vnd.google-apps.folder" ? "folder" : "file" // File or folder
        const path = isShared ? diskPath("/Shared", folderPath, name) : diskPath(folderPath, name) // Absolute path to the file
        const mimeType = fileObj.mimeType // Mime type
        const size = fileObj.fileSize // Size in bytes, let clients convert to whatever unit they want
        const createdAtTime = fileObj.createdDate // When it was created
        const lastModifiedTime = fileObj.modifiedDate // Last time the file or its metadata was changed
        const exportMimeType = getExportTypeForDoc(mimeType)
        let contentURI = null
        // If the export type is media, then return a googleapis.com link
        if (exportType === "media") {
          contentURI = `https://www.googleapis.com/drive/v3/files/${fileObj.id}?alt=media`
        } else if (exportType === "view") {
          // If the export type is view, return an "Open in Google Editor" link
          contentURI = `https://drive.google.com/open?id=${fileObj.id}`
        } else {
          // Else:
          // First check that it is not a Google Doc/Sheet/Slide/Drawing/App Script
          if (exportMimeType === "auto") {
            // If not, then give the web content link (only downloadable by browser)
            contentURI = fileObj.webContentLink
          } else {
            // Else it is a Doc/Sheet/Slide/Drawing/App Script
            // If the requested export type is in the exportLinks field, return that link
            if (fileObj.exportLinks[exportType]) {
              contentURI = fileObj.exportLinks[exportType]
            } else {
              // Else return the MS format of it
              contentURI = fileObj.exportLinks[exportMimeType]
            }
          }
        }

        // Log it
        log("google_drive", `Adding file to results (Parsed name => ${name}; kind => ${kind}; path => ${path}; mimeType => ${mimeType}; size => ${size}; createdAtTime => ${createdAtTime}; lastModifiedTime => ${lastModifiedTime}; contentURI => ${contentURI})`)

        // Append to a final array that will be returned
        fileObjs.push({
          name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
        })
      }

      // Sort the array now
      fileObjs = sortFiles(compareWith, operator, value, orderBy, direction, fileObjs)

      // Log it
      log("google_drive", `Sorted files, final result => ${json(fileObjs, true)}`)

      // Return all the files as a final array
      return fileObjs
    } else {
      // Log it
      log("google_drive", `No files returned`)
      // Empty folder
      return []
    }
  }

  // Return a file obj at a specified location
  async read(body, headers, params, queries) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://www.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Get the folder path from the URL
    const folderPath = diskPath(params["folderPath"].replace("Shared", ""))
    // Get the file path from the URL
    const fileName = params["fileName"]
    // Get the export type from the query parameters
    const exportType = queries["exportType"]
    // Is the file shared (explicitly or implicitly)
    const isShared = diskPath(params["folderPath"]).startsWith("/Shared") || diskPath(params["folderPath"]).startsWith("Shared")

    // Log it
    log("google_drive", `Folder path => ${folderPath}; file name => ${fileName}; shared => ${isShared}; queries => ${json(queries, true)}`)

    // Don't allow relative paths, let clients do that
    if ([folderPath, fileName].join("/").indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }
    
    // Get the parent folder ID
    const folderId = await getFolderWithParents(instance, folderPath, isShared)

    // Log it
    log("google_drive", `Folder ID => ${folderId}`)

    // Construct the query
    let q
    if (diskPath(params["folderPath"]) === "/Shared") {
      // If the folder path is /Shared, the file has been shared individually.
      q = `title='${fileName}' and trashed = false and sharedWithMe = true`
    } else {
      // Else just do a normal get
      q = `title='${fileName}' and '${folderId}' in parents and trashed = false`
    }

    // Log it
    log("google_drive", `Running GET request on files matching query => ${q}`)
    
    // Query the Drive API
    // No need to do the pagination thing here, our query is specifically searching for a file
    const listResult = await instance.get("/drive/v2/files", {
      params: {
        q: q,
        fields: `items(id, title, mimeType, fileSize, createdDate, modifiedDate, defaultOpenWithLink, webContentLink, exportLinks)`
      }
    })

    if (listResult.data.items.length > 0) {
      // If we get a valid result
      // Log it
      log("google_drive", `Received ${listResult.data.items.length} item(s)`)
      // Get the file metadata and content
      const fileObj = listResult.data.items[0]
      const name = fileObj.title // Name of the file
      const kind = fileObj.mimeType == "application/vnd.google-apps.folder" ? "folder" : "file" // File or folder
      const path = isShared ? diskPath("/Shared", folderPath, name) : diskPath(folderPath, name) // Absolute path to the file
      const mimeType = fileObj.mimeType // Mime type
      const size = fileObj.fileSize // Size in bytes, let clients convert to whatever unit they want
      const createdAtTime = fileObj.createdDate // When it was created
      const lastModifiedTime = fileObj.modifiedDate // Last time the file or its metadata was changed
      const exportMimeType = getExportTypeForDoc(mimeType)
      let contentURI = null
      // If the export type is media and it is not a Google Doc/Sheet/Slide/Drawing/App Script, then return a googleapis.com link
      if (exportType === "media" && exportMimeType === "auto") {
        contentURI = `https://www.googleapis.com/drive/v3/files/${fileObj.id}?alt=media`
      } else if (exportType === "view") {
        // If the export type is view, return an "Open in Google Editor" link
        contentURI = `https://drive.google.com/open?id=${fileObj.id}`
      } else {
        // Else:
        // First check that it is not a Google Doc/Sheet/Slide/Drawing/App Script
        if (exportMimeType === "auto") {
          // If not, then give the web content link (only downloadable by browser)
          contentURI = fileObj.webContentLink
        } else {
          // Else it is a Doc/Sheet/Slide/Drawing/App Script
          // If the requested export type is in the exportLinks field, return that link
          if (fileObj.exportLinks[exportType]) {
            contentURI = fileObj.exportLinks[exportType]
          } else {
            // Else return the MS format of it
            contentURI = fileObj.exportLinks[exportMimeType]
          }
        }
      }

      // Log it
      log("google_drive", `Adding file to results (Parsed name => ${name}; kind => ${kind}; path => ${path}; mimeType => ${mimeType}; size => ${size}; createdAtTime => ${createdAtTime}; lastModifiedTime => ${lastModifiedTime}; contentURI => ${contentURI})`)

      // Return the file metadata and content
      return {
        name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
      }
    } else {
      // Not found
      throw new NotFoundError(`The file ${fileName} does not exist`)
    }
  }

  // Create a file at a specified location
  async create(body, headers, params, queries, fileMeta) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://www.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Get the folder path from the URL
    const folderPath = diskPath(params["folderPath"])
    // Get the file path from the URL
    const fileName = params["fileName"]
    // If they have specified the type of contentURI they want in the returned
    // file object, give them that
    // This must be mentioned in the body as it is a provider-specific variable
    const exportType = body["exportType"]

    // Log it
    log("google_drive", `Folder path => ${folderPath}; file name => ${fileName}; exportType => ${exportType}`)

    // Don't allow relative paths, let clients do that
    if ([folderPath, fileName].join("/").indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Check if there is a file uploaded
    if (!fileMeta) {
      // If not, error out
      throw new MissingParamError(`Missing file data under content param in request body`)
    }

    // Get the folder ID
    const folderId = await getFolderWithParents(instance, folderPath, false, true)
    
    // Check if the file already exists
    await getFileId(instance, fileName, folderId, false, true)
    
    // Construct the metadata of the file
    let meta = {
      "title": fileName,
      parents: [{id: folderId}],
      mimeType: (await fileTypes.fromFile(fileMeta.path) || {}).mime
    }

    // If there is a lastModifiedTime present, set the file's lastModifiedTime to that
    if (body["lastModifiedTime"]) {
      meta["modifiedDate"] = new Date(body["lastModifiedTime"]).toISOString()
    }

    // Log it
    log("google_drive", `File metadata => ${json(meta, true)}`)

    // First, post the file meta data to let Google Drive know we are posting the file's contents too
    const driveMetaResult = await instance.post("/drive/v2/files", meta)

    if (driveMetaResult.data) {
      // If drive acknowledges the request, then upload the file as well
      const file = driveMetaResult.data
      // Log it
      log("google_drive", `Uploaded metadata successfully; file ID => ${file.id}; uploading file from local path => ${fileMeta.path}`)
      // Upload the file's content
      let result = await instance.put(`/upload/drive/v2/files/${file.id}?convert=true&uploadType=media`, fs.createReadStream(fileMeta.path))
      if (result.data) {
        // Log it
        log("google_drive", `File successfully uploaded, checking if conversion is required`)
        // If the uploaded file is an MS Office file, convert it to a Google Doc/Sheet/Slide
        const importType = getImportTypeForDoc(result.data.mimeType)
        if (importType !== "auto") {
          // Log it
          log("google_drive", `Converting file to Google Workspace format => ${importType}`)
          // Copy the file in a converted format
          result = await instance.post(`/drive/v2/files/${file.id}/copy?convert=true`)
          // Log it
          log("google_drive", `Converted file succesfully => ${result.data.id}`)
          // Delete the original one
          await instance.delete(`/drive/v2/files/${file.id}`)
          // Log it
          log("google_drive", `Deleted original format document => ${file.id}`)
        }

        // If the creation was successful, return a file object
        if (result.data) {
          // Log it
          log("google_drive", `Upload (and conversion, if applicable) finished successfully, returning file meta and content URI`)

          const fileObj = result.data

          const name = fileObj.title // Name of the file
          const kind = fileObj.mimeType == "application/vnd.google-apps.folder" ? "folder" : "file" // File or folder
          const path = isShared ? diskPath("/Shared", folderPath, name) : diskPath(folderPath, name) // Absolute path to the file
          const mimeType = fileObj.mimeType // Mime type
          const size = fileObj.fileSize // Size in bytes, let clients convert to whatever unit they want
          const createdAtTime = fileObj.createdDate // When it was created
          const lastModifiedTime = fileObj.modifiedDate // Last time the file or its metadata was changed
          const exportMimeType = getExportTypeForDoc(mimeType)
          let contentURI = null
          // If the export type is media and it is not a Google Doc/Sheet/Slide/Drawing/App Script, then return a googleapis.com link
          if (exportType === "media" && exportMimeType === "auto") {
            contentURI = `https://www.googleapis.com/drive/v3/files/${fileObj.id}?alt=media`
          } else if (exportType === "view") {
            // If the export type is view, return an "Open in Google Editor" link
            contentURI = `https://drive.google.com/open?id=${fileObj.id}`
          } else {
            // Else:
            // First check that it is not a Google Doc/Sheet/Slide/Drawing/App Script
            if (exportMimeType === "auto") {
              // If not, then give the web content link (only downloadable by browser)
              contentURI = fileObj.webContentLink
            } else {
              // Else it is a Doc/Sheet/Slide/Drawing/App Script
              // If the requested export type is in the exportLinks field, return that link
              if (fileObj.exportLinks[exportType]) {
                contentURI = fileObj.exportLinks[exportType]
              } else {
                // Else return the MS format of it
                contentURI = fileObj.exportLinks[exportMimeType]
              }
            }
          }

          // Log it
          log("google_drive", `Returning file (Parsed name => ${name}; kind => ${kind}; path => ${path}; mimeType => ${mimeType}; size => ${size}; createdAtTime => ${createdAtTime}; lastModifiedTime => ${lastModifiedTime}; contentURI => ${contentURI})`)

          // Return the file metadata and content
          return {
            name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
          }
        }
      } else {
        throw new GeneralError(500, "Error while uploading file bytes to Google Drive.", "invalidResponse")
      }
    } else {
      // Else throw an error
      throw new GeneralError(500, "No response from Google Drive. Cancelling file upload.", "invalidResponse")
    }
  }

  // Update the file at the specified location with the file provided
  async update(body, headers, params, queries, fileMeta) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://www.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Get the folder path from the URL
    let folderPath = diskPath(params["folderPath"])
    // Get the file path from the URL
    let fileName = params["fileName"]

    // Log it
    log("google_drive", `Folder path => ${folderPath}; file name => ${fileName}`)

    // Don't allow relative paths, let clients do that
    if ([folderPath, fileName].join("/").indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Get the folder and file ID
    const folderId = await getFolderWithParents(instance, folderPath, false, false)
    const fileId = await getFileId(instance, fileName, folderId, false, false)

    // Log it
    log("google_drive", `Folder ID => ${folderId}; file ID => ${fileId}`)

    // The result of the operation
    let result

    // Upload the new file data if provided
    if (fileMeta) {
      // Log it
      log("google_drive", `Detected content upload, updating file contents in drive with contents of file => ${fileMeta.path}`)
      result = await instance.put(`/upload/drive/v2/files/${fileId}?uploadType=media`, fs.createReadStream(fileMeta.path))
    }

    // Check if the user passed fields to set values in
    // We can only set name, path, and lastModifiedTime, not createdAtTime
    if (body["name"]) {
      // Log it
      log("google_drive", `Detected name field, patching file name => ${body["name"]}`)
      // Rename the file by sending a patch request
      result = await instance.patch(`/drive/v2/files/${fileId}`, {
        "title": body["name"]
      })
      // Log it
      log("google_drive", `Patch succesfull, file renamed => ${body["name"]}`)
      fileName = body["name"]
    }
    if (body["path"]) {
      // Log it
      log("google_drive", `Detected path field, moving file => ${body["path"]}`)
      // Don't allow relative paths, let clients do that
      if (body["path"].indexOf("/..") !== -1) {
        throw new BadRequestError(`Folder paths must not contain relative paths`)
      }
      // Get the new folder ID
      const newFolderId = await getFolderWithParents(instance, body["path"], false, true)
      // Log it
      log("google_drive", `New folder ID => ${newFolderId}`)
      // Move the file by sending a patch request
      result = await instance.patch(`/drive/v2/files/${fileId}`, {
        parents: [{id: newFolderId}],
      })
      // Log it
      log("google_drive", `Patch successfull, moved file to new path => ${body["path"]}`)
      folderPath = body["path"]
    }
    if (body["lastModifiedTime"]) {
      const modifiedDate = new Date(body["lastModifiedTime"]).toISOString()
      // Log it
      log("google_drive", `Detected lastModifiedTime field, patching to => ${modifiedDate}`)
      // Set the lastModifiedTime by sending a patch request
      result = await instance.patch(`/drive/v2/files/${fileId}?modifiedDateBehavior=fromBody`, {
        "modifiedDate": modifiedDate
      })
      // Log it
      log("google_drive", `Patch successfull, last modified data set => ${modifiedDate}`)
    }

    // Now send back the updated file object
    if (result.response && result.response.data) {
      // Log it
      log("google_drive", `Patch requests successfull, returning file object`)

      const fileObj = result.response.data
      // If the creation was successful, return a file object
      const name = fileObj.title // Name of the file
      const kind = fileObj.mimeType == "application/vnd.google-apps.folder" ? "folder" : "file" // File or folder
      const path = isShared ? diskPath("/Shared", folderPath, name) : diskPath(folderPath, name) // Absolute path to the file
      const mimeType = fileObj.mimeType // Mime type
      const size = fileObj.fileSize // Size in bytes, let clients convert to whatever unit they want
      const createdAtTime = fileObj.createdDate // When it was created
      const lastModifiedTime = fileObj.modifiedDate // Last time the file or its metadata was changed
      const exportMimeType = getExportTypeForDoc(mimeType)
      let contentURI = null
      // If the export type is media and it is not a Google Doc/Sheet/Slide/Drawing/App Script, then return a googleapis.com link
      if (exportType === "media" && exportMimeType === "auto") {
        contentURI = `https://www.googleapis.com/drive/v3/files/${fileObj.id}?alt=media`
      } else if (exportType === "view") {
        // If the export type is view, return an "Open in Google Editor" link
        contentURI = `https://drive.google.com/open?id=${fileObj.id}`
      } else {
        // Else:
        // First check that it is not a Google Doc/Sheet/Slide/Drawing/App Script
        if (exportMimeType === "auto") {
          // If not, then give the web content link (only downloadable by browser)
          contentURI = fileObj.webContentLink
        } else {
          // Else it is a Doc/Sheet/Slide/Drawing/App Script
          // If the requested export type is in the exportLinks field, return that link
          if (fileObj.exportLinks[exportType]) {
            contentURI = fileObj.exportLinks[exportType]
          } else {
            // Else return the MS format of it
            contentURI = fileObj.exportLinks[exportMimeType]
          }
        }
      }

      // Log it
      log("google_drive", `Returning file (Parsed name => ${name}; kind => ${kind}; path => ${path}; mimeType => ${mimeType}; size => ${size}; createdAtTime => ${createdAtTime}; lastModifiedTime => ${lastModifiedTime}; contentURI => ${contentURI})`)

      // Return the file metadata and content
      return {
        name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
      }
    }
  }

  // Delete the file or folder at the specified location
  async delete(body, headers, params, queries) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://www.googleapis.com/",
      headers: {"Authorization": accessToken}
    })

    // Get the folder path from the URL
    const folderPath = diskPath(params["folderPath"])
    // Get the file path from the URL
    const fileName = params["fileName"]

    // Log it
    log("google_drive", `Folder path => ${folderPath}; file name => ${fileName}`)

    // Don't allow relative paths, let clients do that
    if (folderPath.indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    if (folderPath && fileName) {
      // If there is a file name provided, delete the file
      const filePath = diskPath(folderPath, fileName)

      // Log it
      log("google_drive", `Deleting file => ${filePath}`)

      // Get the file ID
      const fileId = await getFileWithParents(instance, filePath)

      // Log it
      log("google_drive", `Deleting file with ID => ${fileId}`)

      // Delete the file
      return await instance.delete(`/drive/v2/files/${fileId}`)
    } else if (folderPath && !fileName) {
      // If there is only a folder name provided, delete the folder
      // Get the folder ID
      const folderId = await getFolderWithParents(instance, folderPath)

      // Log it
      log("google_drive", `Deleting folder => ${folderPath}; ID => ${folderId}`)

      // Delete the folder
      return await instance.delete(`/drive/v2/files/${folderId}`)
    } else {
      // Else error out
      throw new BadRequestError(`Must provide either folder path or file path to delete`)
    }
  }
}

// MARK: Exports

// Export the GoogleDriveDataProvider as the default export
exports.default = GoogleDriveDataProvider