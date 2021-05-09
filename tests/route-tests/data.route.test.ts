/*
 * @jest-environment node
 */

// Test the data route

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

describe('test data routes', () => {
	it('fail - missing credentials', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F')
			.query({
				providerId: 'googledrive',
			})

		if (response.status !== 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('missingCredentials')
	})

	it('fail - invalid credentials', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F')
			.query({
				providerId: 'googledrive',
			})
			.set('X-Credentials', 'absolutely horrendously invalid token')

		if (response.status !== 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
		expect(response.body.error.reason).toEqual('invalidCredentials')
	})

	it('fail - list - invalid provider', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F')
			.query({
				providerId: 'random-invalid-provider',
			})
			.set('X-Credentials', process.env.DABBU_TOKEN!)

		if (response.status !== 501) {
			console.log(response.body)
		}
		expect(response.status).toEqual(501)
		expect(response.body.error.reason).toEqual('invalidProviderId')
	})
})
