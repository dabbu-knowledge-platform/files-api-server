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
const mmmagic = require("mmmagic")

// Custom errors we throw
const { NotFoundError, BadRequestError, FileExistsError, MissingParamError } = require("../errors.js")
// Used to generate platform-independent file/folder paths
const { diskPath } = require("../utils.js")

// Import the default Provider class we need to extend
const Provider = require("./provider.js").default

// MARK: Variables

// Instantiate the mime library
const mimeLib = new mmmagic.Magic(mmmagic.MAGIC_MIME_TYPE)

// MARK: HardDriveDataProvider

class HardDriveDataProvider extends Provider {
  constructor() {
    super()
  }

  // List files and folders at a location
  async list(providerData, headers, params, queries) {
    // Get the base path provided in the request body
    const basePath = providerData["base_path"]
    if (!basePath) {
      // If it doesn't exist, error out
      throw new MissingParamError("Expected base path to be part of request body")
    }
    // Get the folder path in the URL
    const folderPath = params["folderPath"]
    var {compareWith, operator, value, orderBy, direction} = queries

    // Don't allow relative paths, let clients do that
    if (diskPath(basePath, folderPath).indexOf("..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Check if the folder exists
    if (!(await fs.pathExists(diskPath(basePath, folderPath)))) {
      throw new NotFoundError(`Folder ${diskPath(basePath, folderPath)} was not found`)
    }

    // List the files and folders at that location
    const files = await fs.readdir(diskPath(basePath, folderPath))
    const fileObjs = []
    // Loop through the list of files
    for (var i = 0, length = files.length; i < length; i++) {
      const fileName = files[i]
      // Get the statistics related to that file, `fs.readdir` only gives the name
      const statistics = await fs.stat(diskPath(basePath, folderPath, fileName)) // Change to lstat if you want to support sym links

      const name = fileName // Name of the file
      const kind = statistics.isFile() ? "file" : statistics.isDirectory() ? "folder" : "other" // Whether it's a file or folder
      const path = diskPath(basePath, folderPath, fileName) // Path to that file locally
      const mimeType = await new Promise((resolve, reject) => {
        mimeLib.detectFile(diskPath(basePath, folderPath, fileName), function(err, result) {
          if (err) reject(err)
          resolve(result)
        })
      }) // The mime type of the file
      const size = statistics["size"] // Size in bytes, let clients convert to whatever unit they want
      const createdAtTime = statistics["birthTime"] // When it was created
      const lastModifiedTime = statistics["ctime"] // Last time the file or its metadata was changed
      const contentURI = "file://" + diskPath(basePath, folderPath, fileName).replace(/\ /g, "%20") // Content URI, allows the file to be downloaded

      // Append to a final array that will be returned
      fileObjs.push({
        name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI
      })
    }
    // Return all the files as a final array
    return fileObjs
  }

  // Return a file obj at a specified location
  async read(providerData, headers, params, queries) {
    // Get the base path provided in the request body
    const basePath = providerData["base_path"]
    // Get the folder path in the URL
    const folderPath = params["folderPath"]
    // Get the file name in the URL
    const fileName = params["fileName"]

    // Don't allow relative paths, let clients do that
    if (diskPath(basePath, folderPath).indexOf("..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Check if the folder exists
    if (!(await fs.pathExists(diskPath(basePath, folderPath)))) {
      throw new NotFoundError(`Folder ${diskPath(basePath, folderPath)} was not found`)
    }

    // Get the statistics related to that file, `fs.readdir` only gives the name
    const statistics = await fs.stat(diskPath(basePath, folderPath, fileName)) // Change to lstat if you want to support sym links

    const name = fileName // Name of the file
    const kind = statistics.isFile() ? "file" : statistics.isDirectory() ? "folder" : "other" // Whether it's a file or folder
    const path = diskPath(basePath, folderPath, fileName) // Path to that file locally
    const mimeType = await new Promise((resolve, reject) => {
      mimeLib.detectFile(diskPath(basePath, folderPath, fileName), function(err, result) {
        if (err) reject(err)
        resolve(result)
      })
    }) // The mime type of the file
    const size = statistics["size"] // Size in bytes, let clients convert to whatever unit they want
    const createdAtTime = statistics["birthTime"] // When it was created
    const lastModifiedTime = statistics["ctime"] // Last time the file or its metadata was changed
    const contentURI = "file://" + diskPath(basePath, folderPath, fileName).replace(/\ /g, "%20") // Content URI, allows the file to be downloaded
    return {name, kind, path, mimeType, size, createdAtTime, lastModifiedTime, contentURI} // Return it as an object
  }

  // Create a file at a specified location
  async create(providerData, headers, params, queries, fileMeta) {
    // Get the base path provided in the request body
    const basePath = providerData["base_path"]
    // Get the folder path in the URL
    const folderPath = params["folderPath"]
    // Get the file name in the URL
    const fileName = params["fileName"]

    // Don't allow relative paths, let clients do that
    if (diskPath(basePath, folderPath).indexOf("..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // If the folder doesn't exist, create one
    //await fs.ensureDir(diskPath(basePath, folderPath))

    // Check if the file exists
    if (await fs.pathExists(diskPath(basePath, folderPath, fileName))) {
      throw new FileExistsError(`File ${diskPath(basePath, folderPath, fileName)} already exists`)
    }

    // `fileMeta` is passed to us by multer, and contains the path, size and mime type of the file
    // uploaded. Move the file from that path to the specified one.
    return await fs.move(fileMeta.path, diskPath(basePath, folderPath, fileName))
  }

  // Update the file at the specified location with the file provided
  async update(providerData, headers, params, queries, fileMeta) {
    // Get the base path provided in the request body
    const basePath = providerData["base_path"]
    // Get the folder path in the URL
    const folderPath = params["folderPath"]
    // Get the file name in the URL
    const fileName = params["fileName"]

    // Don't allow relative paths, let clients do that
    if (diskPath(basePath, folderPath).indexOf("..") !== -1) {
      throw new BadRequestError(`Folder paths must not contain relative paths`)
    }

    // Check if the file exists
    if (await fs.pathExists(diskPath(basePath, folderPath, fileName))) {
      throw new NotFoundError(`File ${diskPath(basePath, folderPath, fileName)} was not found`)
    }

    // `fileMeta` is passed to us by multer, and contains the path, size and mime type of the file
    // uploaded. Move the file from that path to the specified one and overwrite it.
    return await fs.move(fileMeta.path, diskPath(basePath, folderPath, fileName), { overwrite: true })
  }

  // Delete the file or folder at the specified location
  async delete(providerData, headers, params, queries) {
    // Get the base path provided in the request body
    const basePath = providerData["base_path"]
    // Get the folder path in the URL
    const folderPath = params["folderPath"]
    // Get the file name in the URL
    const fileName = params["fileName"]

    if (folderPath && fileName) {
      // If there is a file name provided, delete the file      
      // Don't allow relative paths, let clients do that
      if (diskPath(basePath, folderPath).indexOf("..") !== -1) {
        throw new BadRequestError(`Folder paths must not contain relative paths`)
      }

      // Check if the file exists
      if (!(await fs.pathExists(diskPath(basePath, folderPath, fileName)))) {
        throw new NotFoundError(`File ${diskPath(basePath, folderPath, fileName)} was not found`)
      }

      // Delete the file using `fs.unlink`
      return await fs.unlink(diskPath(basePath, folderPath, fileName))
    } else if (folderPath && !fileName) {
      // If there is only a folder name provided, delete the folder and its contents
      // Don't allow relative paths, let clients do that
      if (diskPath(basePath, folderPath).indexOf("..") !== -1) {
        throw new BadRequestError(`Folder paths must not contain relative paths`)
      }

      // Check if the folder exists
      if (!(await fs.pathExists(diskPath(basePath, folderPath)))) {
        throw new NotFoundError(`Folder ${diskPath(basePath, folderPath)} was not found`)
      }
  
      // Recursively delete the folder and its contents
      return await fs.remove(diskPath(basePath, folderPath), { recursive: true })
    } else {
      // Else error out
      throw new BadRequestError(`Must provide either folder path or file path to delete`)
    }
  }
}

// MARK: Exports

// Export the HardDriveDataProvider class as the default export
exports.default = HardDriveDataProvider