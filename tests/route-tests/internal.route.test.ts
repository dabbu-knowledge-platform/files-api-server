/*
 * @jest-environment node
 */

// Test the internal route

// Use supertest to make requests to the server
import request from 'supertest'

// Import the server
import app from '../../src/app'

describe('test internal routes', () => {
	describe('test cache request', () => {
		it('fail - invalid path', async () => {
			const response = await request(app).get(
				'/files-api/v3/internal/cache/some%2F..%2F.%2Frandom%2Fpath%2F',
			)

			if (response.status !== 400) {
				console.log(response.body)
			}
			expect(response.status).toEqual(400)
			expect(response.body.error.reason).toEqual('malformedUrl')
		})
	})
})
