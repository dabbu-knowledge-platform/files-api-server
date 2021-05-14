/*
 * @jest-environment node
 */

// Test the internal route

// Use supertest to make requests to the server
import request from 'supertest'

// Import the server
import app from '../../src/app'
// Import the function to initialise the client database
import * as ClientDb from '../../src/utils/auth.util'

// Before running any tests, refresh all access tokens
beforeAll(async () => {
	// Initialise the client auth database
	await ClientDb.init(':memory:')

	// Also register a client with the server and store the token as an environment variable
	const response = await request(app).post('/files-api/v3/clients/')

	// Set the DABBU_TOKEN environment variable. This variable is local, is set
	// to null once the process ends. NEVER console.log this variable
	process.env.DABBU_TOKEN = `${Buffer.from(
		`${response.body.content.id}:${response.body.content.apiKey}`,
	).toString('base64')}`
})

describe('test internal routes', () => {
	describe('test cache request', () => {
		it('fail - missing credentials', async () => {
			const response = await request(app).get(
				'/files-api/v3/internal/cache/existent-file',
			)

			if (response.status !== 403) {
				console.log(response.body)
			}
			expect(response.status).toEqual(403)
			expect(response.body.error.reason).toEqual('missingCredentials')
		})

		it('fail - invalid credentials', async () => {
			const response = await request(app)
				.get('/files-api/v3/internal/cache/existent-file')
				.set('X-Credentials', 'absolutely horrendously invalid token')

			if (response.status !== 401) {
				console.log(response.body)
			}
			expect(response.status).toEqual(401)
			expect(response.body.error.reason).toEqual('invalidCredentials')
		})

		it('fail - invalid path', async () => {
			const response = await request(app)
				.get('/files-api/v3/internal/cache/non-existent-file')
				.set('X-Credentials', process.env.DABBU_TOKEN!)

			if (response.status !== 404) {
				console.log(response.body)
			}
			expect(response.status).toEqual(404)
			expect(response.body.error.reason).toEqual('notFound')
		})

		it('fail - relative path', async () => {
			const response = await request(app)
				.get(
					'/files-api/v3/internal/cache/some%2F..%2F.%2Frandom%2Fpath%2F',
				)
				.set('X-Credentials', process.env.DABBU_TOKEN!)

			if (response.status !== 400) {
				console.log(response.body)
			}
			expect(response.status).toEqual(400)
			expect(response.body.error.reason).toEqual('malformedUrl')
		})
	})
})
