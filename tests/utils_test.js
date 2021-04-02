/* Dabbu Files API Server - utils_test.js
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

// Import the functions
const {cachePath, diskPath, sortFiles} = require('../src/utils.js')
// Library to run tests
const test = require('ava')

// MARK: Tests

// The actual tests using ava

test('test cache path creation', (t) => {
	t.is(
		cachePath('folder-name/new file:with weird-chars'),
		'http://localhost:8080/files-api/v1/internal/cache/folder-name%2Fnew%20file%3Awith%20weird-chars'
	)
})

test('test path resolving function', (t) => {
	t.is(
		diskPath(
			'/',
			'folder 1',
			'..',
			'folder-2',
			'.',
			'..',
			'one to go folder',
			'final-folder'
		),
		'/one to go folder/final-folder'
	)
})

test('test sorting function', (t) => {
	// TODO: Test sorting function
	t.pass()
})
