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
const { BadRequestError } = require("../errors.js")
// Used to generate platform-independent file/folder paths
const { diskPath, sortFiles } = require("../utils.js")

// Import the default Provider class we need to extend
const Provider = require("./provider.js").default

// MARK: OneDriveDataProvider

class OneDriveDataProvider extends Provider {
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
      baseURL: "https://graph.microsoft.com/v1.0/",
      headers: {"Authorization": accessToken}
    })

    // Is the file shared (explicitly or implicitly)
    const isShared = diskPath(params["folderPath"]).startsWith("/Shared") || diskPath(params["folderPath"]).startsWith("Shared")
    // Get the folder path from the URL and replace the /Shared part if it is in the beginning
    const folderPath = diskPath(isShared ? params["folderPath"].replace("Shared", "") : params["folderPath"])
    // Get the export type and compare/sort params from the query parameters
    let {compareWith, operator, value, orderBy, direction, exportType} = queries

    // Don't allow relative paths, let clients do th
    if (folderPath.indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Query the one drive API for the docs
    const listResult = await instance.get(
        isShared 
          ? `/me/drive/sharedWithMe${folderPath && folderPath !== "/" ? `:${folderPath}:` : ""}`
          : `/me/drive/root${folderPath && folderPath !== "/" ? `:${folderPath}:` : ""}/children`
    )

    // Get the list of files and folders
    if (listResult.data && listResult.data.value && listResult.data.value.length !== 0) {
      // If a valid result is returned, loop through all the files and folders there
      let fileObjs = []
      for (let i = 0, length = listResult.data.value.length; i < length; i++) {
        const fileObj = listResult.data.value[i]
        const name = fileObj.name // Name of the file
        const kind = fileObj.folder ? "folder" : "file" // File or folder
        const path = isShared ? diskPath("/Shared", folderPath, name) : diskPath(folderPath, name) // Absolute path to the file
        const mimeType = kind === "folder" ? "application/vnd.one-drive.folder" : fileObj.file ? fileObj.file.mimeType : fileObj.package ? fileObj.package.type : null// Mime type
        const size = fileObj.size // Size in bytes, let clients convert to whatever unit they want
        const createdAtTime = fileObj.fileSystemInfo.createdDateTime // When it was created
        const lastModifiedTime = fileObj.fileSystemInfo.lastModifiedDateTime // Last time the file or its metadata was changed
        let contentURI = null
        // If the export type is media, then return a googleapis.com link
        if (exportType === "view") {
          // If the export type is view, return an "Open in One Drive Editor" link
          contentURI = fileObj.webUrl
        } else {
          // Else return a link that streams the file's contents
          contentURI = fileObj["@microsoft.graph.downloadUrl"] // Without access token, but short-lived
              || (`https://graph.microsoft.com/v1.0/${isShared ? `/me/drive/sharedWithMe:${path}:/content` : `/me/drive/root:${path}:/content`}`) // With access token
        }

        // Append to a final array that will be returned
        fileObjs.push({
          name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
        })
      }

      // Sort the array now
      fileObjs = sortFiles(compareWith, operator, value, orderBy, direction, fileObjs)

      // Return all the files as a final array
      return fileObjs
    } else {
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
      baseURL: "https://graph.microsoft.com/v1.0/",
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

    // Don't allow relative paths, let clients do that
    if ([folderPath, fileName].join("/").indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Query the one drive API for the docs
    const listResult = await instance.get(
      isShared 
        ? `/me/drive/sharedWithMe:${diskPath(folderPath, fileName)}:`
        : `/me/drive/root:${diskPath(folderPath, fileName)}`
    )

    if (listResult.data) {
      const fileObj = listResult.data
      const name = fileObj.name // Name of the file
      const kind = fileObj.folder ? "folder" : "file" // File or folder
      const path = isShared ? diskPath("/Shared", folderPath, name) : diskPath(folderPath, name) // Absolute path to the file
      const mimeType = kind === "folder" ? "application/vnd.one-drive.folder" : fileObj.file ? fileObj.file.mimeType : fileObj.package ? fileObj.package.type : null// Mime type
      const size = fileObj.size // Size in bytes, let clients convert to whatever unit they want
      const createdAtTime = fileObj.fileSystemInfo.createdDateTime // When it was created
      const lastModifiedTime = fileObj.fileSystemInfo.lastModifiedDateTime // Last time the file or its metadata was changed
      let contentURI = null
      // If the export type is media, then return a googleapis.com link
      if (exportType === "view") {
        // If the export type is view, return an "Open in One Drive Editor" link
        contentURI = fileObj.webUrl
      } else {
        // Else return a link that streams the file's contents
        contentURI = fileObj["@microsoft.graph.downloadUrl"] // Without access token, but short-lived
            || (`https://graph.microsoft.com/v1.0/${isShared ? `/me/drive/sharedWithMe:${path}:/content` : `/me/drive/root:${path}:/content`}`) // With access token
      }

      // Return the object
      return ({
        name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
      })
    }
  }

  // Create a file at a specified location
  async create(body, headers, params, queries, fileMeta) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0/",
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

    // Don't allow relative paths, let clients do that
    if ([folderPath, fileName].join("/").indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Check if there is a file uploaded
    if (!fileMeta) {
      // If not, error out
      throw new MissingParamError(`Missing file data under content param in request body`)
    }

    let result

    // Run a PUT request to upload the file contents to a new file
    // We don't need to create folders if they don't exist, One Drive does that for us
    const mimeType =  (await fileTypes.fromFile(fileMeta.path) || {}).mime
    result = await instance.put(`/me/drive/root:${diskPath(folderPath, fileName)}:/content`, fs.createReadStream(fileMeta.path), {
      headers: {
        "Content-Type": mimeType
      }
    })

    // Update the files metadata with the given fields
    let meta = {}
    // If there is a lastModifiedTime present, set the file's lastModifiedTime to that
    if (body["lastModifiedTime"]) {
      meta["lastModifiedTime"] = new Date(body["lastModifiedTime"]).toISOString()
    }

    // If there is a createdAtTime present, set the file's createdAtTime to that
    if (body["createdAtTime"]) {
      meta["createdAtTime"] = new Date(body["createdAtTime"]).toISOString()
    }

    // Update the files metadata with the given fields
    if (meta.lastModifiedTime || meta.createdAtTime) {
      // Run a patch request to update the metadata
      result = await instance.patch(`/me/drive/root:${diskPath(folderPath, fileName)}:/`, {
        fileSystemInfo: {
          createdDateTime: new Date(meta["createdAtTime"]).toISOString(),
          lastModifiedDateTime: new Date(meta["lastModifiedTime"]).toISOString()
        }
      })
    }

    if (result.data) {
      const fileObj = result.data
      const name = fileObj.name // Name of the file
      const kind = fileObj.folder ? "folder" : "file" // File or folder
      const path = diskPath(folderPath, name) // Absolute path to the file
      const mimeType = kind === "folder" ? "application/vnd.one-drive.folder" : fileObj.file ? fileObj.file.mimeType : fileObj.package ? fileObj.package.type : null// Mime type
      const size = fileObj.size // Size in bytes, let clients convert to whatever unit they want
      const createdAtTime = fileObj.fileSystemInfo.createdDateTime // When it was created
      const lastModifiedTime = fileObj.fileSystemInfo.lastModifiedDateTime // Last time the file or its metadata was changed
      let contentURI = null
      // If the export type is media, then return a googleapis.com link
      if (exportType === "view") {
        // If the export type is view, return an "Open in One Drive Editor" link
        contentURI = fileObj.webUrl
      } else {
        // Else return a link that streams the file's contents
        contentURI = fileObj["@microsoft.graph.downloadUrl"] // Without access token, but short-lived
            || (`https://graph.microsoft.com/v1.0/${isShared ? `/me/drive/sharedWithMe:${path}:/content` : `/me/drive/root:${path}:/content`}`) // With access token
      }

      // Return the object
      return ({
        name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
      })
    }
  }

  // Update the file at the specified location with the file provided
  async update(body, headers, params, queries, fileMeta) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0/",
      headers: {"Authorization": accessToken}
    })

    // Get the folder path from the URL
    let folderPath = diskPath(params["folderPath"])
    // Get the file path from the URL
    let fileName = params["fileName"]
    // If they have specified the type of contentURI they want in the returned
    // file object, give them that
    // This must be mentioned in the body as it is a provider-specific variable
    const exportType = body["exportType"]

    // Don't allow relative paths, let clients do that
    if ([folderPath, fileName].join("/").indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // The result of the operation
    let result

    // Upload the new file data if provided
    if (fileMeta) {
      // Run a PUT request to upload the file contents to a new file
      // We don't need to create folders if they don't exist, One Drive does that for us
      const mimeType =  (await fileTypes.fromFile(fileMeta.path) || {}).mime
      result = await instance.put(`/me/drive/root:${diskPath(folderPath, fileName)}:/content`, fs.createReadStream(fileMeta.path), {
        headers: {
          "Content-Type": mimeType
        }
      })
    }

    // Check if the user passed fields to set values in
    // We can set name, path, createAtTime and lastModifiedTime
    if (body["name"]) {
      // Rename the file by sending a patch request
      console.log(body["name"])
      result = await instance.patch(`/me/drive/root:${diskPath(folderPath, fileName)}:/`, {
        "name": body["name"]
      })
      fileName = body["name"]
    }
    if (body["path"]) {
      // Don't allow relative paths, let clients do that
      if (body["path"].indexOf("/..") !== -1) {
        throw new BadRequestError(`Folder paths must not contain relative paths`)
      }
      // Set the new parent on the file
      // First get the ID of the new folder
      result = await instance.get(`/me/drive/root:${diskPath(body["path"])}:/`)
      // Then set it on the file
      result = await instance.patch(`/me/drive/root:${diskPath(folderPath, fileName)}:/`, {
        parentReference: {
          id: result.data.id
        }
      })
      folderPath = body["path"]
    }
    if (body["lastModifiedTime"]) {
      const modifiedDate = new Date(body["lastModifiedTime"]).toISOString()
      // Set the lastModifiedTime by sending a patch request
      result = await instance.patch(`/me/drive/root:${diskPath(folderPath, fileName)}:/`, {
        fileSystemInfo: {
          lastModifiedDateTime: modifiedDate
        }
      })
    }
    if (body["createAtTime"]) {
      const modifiedDate = new Date(body["createAtTime"]).toISOString()
      // Set the createAtTime by sending a patch request
      result = await instance.patch(`/me/drive/root:${diskPath(folderPath, fileName)}:/`, {
        fileSystemInfo: {
          createdDateTime: modifiedDate
        }
      })
    }

    if (result.data) {
      const fileObj = result.data
      const name = fileObj.name // Name of the file
      const kind = fileObj.folder ? "folder" : "file" // File or folder
      const path = diskPath(folderPath, name) // Absolute path to the file
      const mimeType = kind === "folder" ? "application/vnd.one-drive.folder" : fileObj.file ? fileObj.file.mimeType : fileObj.package ? fileObj.package.type : null// Mime type
      const size = fileObj.size // Size in bytes, let clients convert to whatever unit they want
      const createdAtTime = fileObj.fileSystemInfo.createdDateTime // When it was created
      const lastModifiedTime = fileObj.fileSystemInfo.lastModifiedDateTime // Last time the file or its metadata was changed
      let contentURI = null
      // If the export type is media, then return a googleapis.com link
      if (exportType === "view") {
        // If the export type is view, return an "Open in One Drive Editor" link
        contentURI = fileObj.webUrl
      } else {
        // Else return a link that streams the file's contents
        contentURI = fileObj["@microsoft.graph.downloadUrl"] // Without access token, but short-lived
            || (`https://graph.microsoft.com/v1.0/${isShared ? `/me/drive/sharedWithMe:${path}:/content` : `/me/drive/root:${path}:/content`}`) // With access token
      }

      // Return the object
      return ({
        name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
      })
    }
  }

  // Delete the file or folder at the specified location
  async delete(body, headers, params, queries) {
    // Get the access token from the header
    const accessToken = headers["Authorization"] || headers["authorization"]
    // Create an axios instance with the header. All requests will be made with this 
    // instance so the headers will be present everywhere
    const instance = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0/",
      headers: {"Authorization": accessToken}
    })

    // Get the folder path from the URL
    const folderPath = diskPath(params["folderPath"])
    // Get the file path from the URL
    const fileName = params["fileName"]

    // Don't allow relative paths, let clients do that
    if (folderPath.indexOf("/..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    if (folderPath && fileName) {
      // If there is a file name provided, delete the file
      return await instance.delete(`/me/drive/root:${diskPath(folderPath, fileName)}`)
    } else if (folderPath && !fileName) {
      // If there is only a folder name provided, delete the folder
      return await instance.delete(`/me/drive/root:${diskPath(folderPath)}`)
    } else {
      // Else error out
      throw new BadRequestError(`Must provide either folder path or file path to delete`)
    }
  }
}

// MARK: Exports

// Export the OneDriveDataProvider as the default export
exports.default = OneDriveDataProvider