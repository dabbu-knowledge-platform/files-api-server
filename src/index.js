/* Dabbu Files API Server - index.js
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

// The server itself
const app = require('./app.js')

// Extended file system library
const fs = require('fs-extra')
// Logging methods and utils
const { info } = require('./utils.js')

// Parse the command line arguments and run the server
async function main() {
  let port = 8080
  let enabledProviders = []
  // Get the command line args
  const args = process.argv.slice(2)
  // Check if there are any command line options the user has given
  if (args.length > 0) {
    // Check if the port has been mentioned
    if (args[0]) port = args[0]
    // If there are any more, take them as providers
    if (args.length > 1) enabledProviders = args.slice(1)
  }

  // Initialise the server on the given port with the specified providers
  const server = await app(port, enabledProviders)
  // Allow server ouput
  process.env.DO_NOT_LOG_TO_CONSOLE = false
  // Once it starts, print out the server version and the port it's running on
  info(`Dabbu Files API Server v${require('../package.json').version}`)
  info(`Server listening on port ${port}`)

  // When the user presses CTRL+C, gracefully exit
  process.on('SIGINT', () => {
    info('SIGINT signal received: closing Dabbu Files API Server')
    // Delete the .cache directory
    fs.remove(`./_dabbu/_server/`) // Delete the .cache directory
      .then(() => info('Removed cache. Exiting..'))
      .then(() => server.close()) // Call close on the server created when we called app.listen
      .then(() => info('Server closed'))
      .finally(() => process.exit(0))
  })
}

main()
