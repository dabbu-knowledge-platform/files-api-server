/*
 * @jest-environment node
 */

// Test the data route

// Use supertest to make requests to the server
import request from 'supertest'

// Import the server
import app from '../../src/app'

describe('test data routes', () => {
	describe('test invalid providers', () => {
		it('fail - list - invalid provider', async () => {
			const response = await request(app)
				.get('/files-api/v3/data/%2F')
				.query({
					providerId: 'random-invalid-provider',
				})

			if (response.status !== 501) {
				console.log(response.body)
			}
			expect(response.status).toEqual(501)
			expect(response.body.error.reason).toEqual('invalidProvider')
		})
	})
})
