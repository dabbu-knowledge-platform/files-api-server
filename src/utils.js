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

// MARK: Imports for all functions

const fs = require("fs-extra")

// MARK: Functions

// Print out an informational message
function info(message) {
  const date = new Date().toISOString()
  console.log(` INFO  | ${date} | ${message}`)
  var stream = fs.createWriteStream(`dabbu_server_log.txt`, { flags:'a' })
  stream.write(`INFO  | ${date} | ${message}\n`)
  stream.end()
}

// Print out a debug message if debug mode is enabled
const config = require("./config/dabbu_config.json")
const debugMode = config.runtime.debug
function debug(message) {
  const date = new Date().toISOString()
  if (debugMode === true) {
    console.log(` DEBUG | ${date} | ${message}`)
    var stream = fs.createWriteStream(`dabbu_server_log.txt`, { flags:'a' })
    stream.write(`DEBUG | ${date} | ${message}\n`)
    stream.end()
  }
}

// Print out an error
function error(err) {
  const date = new Date().toISOString()
  console.log(` ERROR | ${date} | ${json(err)}`)
  var stream = fs.createWriteStream(`dabbu_server_log.txt`, { flags:'a' })
  stream.write(`ERROR | ${date} | ${json(err)}\n`)
  stream.write("\n")
  stream.end()
}

// Format JSON
function json(string) {
  return JSON.stringify(string)
}

// Get a platform-independent path
const path = require("path")
function diskPath(...folders) {
  return path.normalize(folders.join("/"))
}

// MARK: Exports

// Export everything
module.exports = {
  info,
  debug,
  error,
  json,
  diskPath
}