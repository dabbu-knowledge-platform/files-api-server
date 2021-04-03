/* Dabbu Files API Server - provider.js
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

// Custom error to return
const { NotImplementedError } = require('../errors.js')

// MARK: Provider

// Default Provider class to be extended by all custom providers
class Provider {
	// Default list function, throws a NotImplementedError
	async list(body, headers, parameters, queries) {
		throw new NotImplementedError(
			`The provider ${parameters.providerId} does not support LIST requests`
		)
	}

	// Default read function, throws a NotImplementedError
	async read(body, headers, parameters, queries) {
		throw new NotImplementedError(
			`The provider ${parameters.providerId} does not support GET requests`
		)
	}

	// Default create function, throws a NotImplementedError
	async create(body, headers, parameters, queries, fileMeta) {
		throw new NotImplementedError(
			`The provider ${parameters.providerId} does not support CREATE requests`
		)
	}

	// Default update function, throws a NotImplementedError
	async update(body, headers, parameters, queries, fileMeta) {
		throw new NotImplementedError(
			`The provider ${parameters.providerId} does not support UPDATE requests`
		)
	}

	// Default delete function, throws a NotImplementedError
	async delete(body, headers, parameters, queries) {
		throw new NotImplementedError(
			`The provider ${parameters.providerId} does not support DELETE requests`
		)
	}
}

// MARK: Export

// Export the Provider class as the default export
exports.default = Provider
