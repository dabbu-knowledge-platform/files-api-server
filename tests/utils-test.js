/* Dabbu Files API Server - utils-test.js
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
const { cachePath, diskPath, sortFiles } = require('../src/utils.js')
// Library to run tests
const test = require('ava')

// MARK: Tests

// The actual tests using ava

test('test cache path creation', (t) => {
	t.is(
		cachePath('folder-name/new file:with weird-chars'),
		'http://localhost:8080/files-api/v2/internal/cache/folder-name%2Fnew%20file%3Awith%20weird-chars'
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
	const sortedFiles = sortFiles(
		'lastModifiedTime',
		'<',
		'2021-04-03T16:20:20.445Z',
		'kind',
		'desc',
		[
			{
				name: 'Dabbu Knowledge Notes',
				kind: 'file',
				provider: 'hard-drive',
				path: '/home/gamemaker1/Documents/Dabbu/Dabbu Knowledge Notes',
				size: 395,
				createdAtTime: '2021-02-27T16:20:20.445Z',
				lastModifiedTime: '2021-04-24T16:20:20.445Z', // This one will be skipped, it's lastModifiedTime is greater than our condition
				contentURI:
					'file:///home/gamemaker1/Documents/Dabbu/Dabbu%20Knowledge%20Notes'
			},
			{
				name: 'Dabbu Reference Architecture',
				kind: 'file',
				provider: 'hard-drive',
				path: '/home/gamemaker1/Documents/Dabbu/Dabbu Reference Architecture',
				mimeType:
					'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				size: 431945,
				createdAtTime: '2021-03-03T07:01:57.588Z',
				lastModifiedTime: '2021-03-03T07:01:57.591Z',
				contentURI:
					'file:///home/gamemaker1/Documents/Dabbu/Dabbu%20Reference%20Architecture'
			},
			{
				name: 'docs',
				kind: 'folder',
				provider: 'hard-drive',
				path: '/home/gamemaker1/Documents/Dabbu/docs/',
				mimeType: 'inode/directory',
				size: 4096,
				createdAtTime: '2021-02-22T16:52:08.465Z',
				lastModifiedTime: '2021-02-22T16:52:08.465Z',
				contentURI: 'file:///home/gamemaker1/Documents/Dabbu/docs/'
			}
		]
	)
	t.deepEqual(sortedFiles, [
		{
			name: 'docs',
			kind: 'folder',
			provider: 'hard-drive',
			path: '/home/gamemaker1/Documents/Dabbu/docs/',
			mimeType: 'inode/directory',
			size: 4096,
			createdAtTime: '2021-02-22T16:52:08.465Z',
			lastModifiedTime: '2021-02-22T16:52:08.465Z',
			contentURI: 'file:///home/gamemaker1/Documents/Dabbu/docs/'
		},
		{
			name: 'Dabbu Reference Architecture',
			kind: 'file',
			provider: 'hard-drive',
			path: '/home/gamemaker1/Documents/Dabbu/Dabbu Reference Architecture',
			mimeType:
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			size: 431945,
			createdAtTime: '2021-03-03T07:01:57.588Z',
			lastModifiedTime: '2021-03-03T07:01:57.591Z',
			contentURI:
				'file:///home/gamemaker1/Documents/Dabbu/Dabbu%20Reference%20Architecture'
		}
	])
})
