/*
 * @jest-environment node
 */

// Test API calls for Gmail

// Use axios to make network requests
import axios from 'axios'
// Use supertest to make requests to the server
import request from 'supertest'

// Import the server
import app from '../../src/app'

// Before running any tests, refresh all access tokens
beforeAll(async () => {
	// Make a request to refresh the access token
	const serverResponse = await axios({
		method: 'post',
		url:
			'https://oauth2.googleapis.com/token' +
			`?client_id=${encodeURIComponent(
				process.env.DABBU_TESTING_GOOGLE_CLIENT_ID!,
			)}&client_secret=${encodeURIComponent(
				process.env.DABBU_TESTING_GOOGLE_CLIENT_SECRET!,
			)}&redirect_uri=${encodeURIComponent(
				process.env.DABBU_TESTING_GOOGLE_REDIRECT_URI!,
			)}&refresh_token=${encodeURIComponent(
				process.env.DABBU_TESTING_GOOGLE_REFRESH_TOKEN!,
			)}&grant_type=refresh_token`,
	})

	// Set the ACCESS_TOKEN environment variable. This variable is local, is set
	// to null once the process ends. NEVER console.log this variable
	process.env.DABBU_TESTING_GOOGLE_ACCESS_TOKEN = `${
		serverResponse.data.token_type || 'Bearer'
	} ${serverResponse.data.access_token}`
})

describe('test list request', () => {
	it('fail - no access token', async () => {
		const response = await request(app).get(
			'/files-api/v3/data/gmail/%2F',
		)

		if (response.status != 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('unauthorized')
	})

	it('fail - invalid access token', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/gmail/%2F')
			.set('Authorization', 'absolutely horrendously invalid token')

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - invalid path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/gmail/%2Fthis-does-not-exist')
			.set(
				'Authorization',
				process.env.DABBU_TESTING_GOOGLE_ACCESS_TOKEN!,
			)

		if (response.status != 404) {
			console.log(response.body)
		}
		expect(response.status).toEqual(404)
	})

	it('succeed - fetch labels', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/gmail/%2F')
			.set(
				'Authorization',
				process.env.DABBU_TESTING_GOOGLE_ACCESS_TOKEN!,
			)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect(
			(response.body.content as Array<DabbuResource>)[0].mimeType,
		).toEqual('mail/label')
	})

	it('succeed - fetch inbox', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/gmail/%2FINBOX')
			.set(
				'Authorization',
				process.env.DABBU_TESTING_GOOGLE_ACCESS_TOKEN!,
			)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect(
			(response.body.content as Array<DabbuResource>)[0].mimeType,
		).toEqual('mail/thread')
	})
})

describe('test read request', () => {
	it('fail - no access token', async () => {
		const response = await request(app).get(
			'/files-api/v3/data/gmail/%2FINBOX/17901f589bb3c9ea',
		)

		if (response.status != 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('unauthorized')
	})

	it('fail - invalid access token', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/gmail/%2FINBOX/17901f589bb3c9ea')
			.set('Authorization', 'absolutely horrendously invalid token')

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - invalid path', async () => {
		const response = await request(app)
			.get(
				'/files-api/v3/data/gmail/%2FINBOX/17901f589bb3c9ea - Something - blahblahblah',
			)
			.set(
				'Authorization',
				process.env.DABBU_TESTING_GOOGLE_ACCESS_TOKEN!,
			)

		if (response.status != 404) {
			console.log(response.body)
		}
		expect(response.status).toEqual(404)
	})

	it('succeed - export type media', async () => {
		const response = await request(app)
			.get(
				'/files-api/v3/data/gmail/%2FINBOX/20210424%20-%2017901f589bb3c9ea%20-%20Re:%20Hi!.zip',
			)
			.set(
				'Authorization',
				process.env.DABBU_TESTING_GOOGLE_ACCESS_TOKEN!,
			)
			.query({
				exportType: 'media',
			})

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'20210424 - 17901f589bb3c9ea - Re: Hi!.zip',
		)
		expect((response.body.content as DabbuResource).size).toBeFalsy()
		expect(
			(response.body.content as DabbuResource).contentUri,
		).toContain('http://localhost:')
	})

	it('succeed - export type view', async () => {
		const response = await request(app)
			.get(
				'/files-api/v3/data/gmail/%2FINBOX/20210424%20-%2017901f589bb3c9ea%20-%20Re:%20Hi!.zip',
			)
			.set(
				'Authorization',
				process.env.DABBU_TESTING_GOOGLE_ACCESS_TOKEN!,
			)
			.query({
				exportType: 'view',
			})

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'20210424 - 17901f589bb3c9ea - Re: Hi!.zip',
		)
		expect((response.body.content as DabbuResource).size).toBeFalsy()
		expect(
			(response.body.content as DabbuResource).contentUri,
		).toContain('https://mail.google.com/mail/u/0/#inbox/')
	})
})
