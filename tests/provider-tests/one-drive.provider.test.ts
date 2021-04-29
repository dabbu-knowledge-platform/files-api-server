/*
 * @jest-environment node
 */

// Test API calls for Google Drive

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
		url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		data: `client_id=${encodeURIComponent(
			process.env.MICROSOFT_CLIENT_ID!,
		)}&client_secret=${encodeURIComponent(
			process.env.MICROSOFT_CLIENT_SECRET!,
		)}&redirect_uri=${encodeURIComponent(
			process.env.MICROSOFT_REDIRECT_URI!,
		)}&refresh_token=${encodeURIComponent(
			process.env.MICROSOFT_REFRESH_TOKEN!,
		)}&grant_type=refresh_token`,
	})

	// Set the ACCESS_TOKEN environment variable. This variable is local, is set
	// to null once the process ends. NEVER console.log this variable
	process.env.MICROSOFT_ACCESS_TOKEN = `${
		serverResponse.data.token_type || 'Bearer'
	} ${serverResponse.data.access_token}`
})

describe('test list request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F')
			.query({ providerId: 'one-drive' })

		if (response.status != 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('unauthorized')
	})

	it('fail - invalid access token', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F')
			.set('Authorization', 'absolutely horrendously invalid token')
			.query({ providerId: 'one-drive' })

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - invalid path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Fthis-does-not-exist')
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 404) {
			console.log(response.body)
		}
		expect(response.status).toEqual(404)
		expect(response.body.error.reason).toEqual('notFound')
	})

	it('fail - relative path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F..%2F.%2Ftests')
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('malformedUrl')
	})

	it('succeed - with access token', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Ftests%2Ftest-files')
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
	})

	it('succeed - with filter by size and order by name options', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Ftests%2Ftest-files')
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)
			.query({
				orderBy: 'name',
				direction: 'asc',
				compareWith: 'size',
				operator: '=',
				value: 23,
			})

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect(
			(response.body.content as Array<DabbuResource>).length,
		).toEqual(1)

		expect(
			(response.body.content as Array<DabbuResource>)[0].name,
		).toEqual('Simple Text')
		expect(
			(response.body.content as Array<DabbuResource>)[0].kind,
		).toEqual('file')
		expect(
			(response.body.content as Array<DabbuResource>)[0].size,
		).toEqual(23)
	})
})

describe('test read request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.get(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fdocuments/Document.docx',
			)
			.query({ providerId: 'one-drive' })

		if (response.status != 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('unauthorized')
	})

	it('fail - invalid access token', async () => {
		const response = await request(app)
			.get(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fdocuments/Document.docx',
			)
			.query({ providerId: 'one-drive' })
			.set('Authorization', 'absolutely horrendously invalid token')

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - invalid path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Ftest%2Ftest-files/non-existent-file')
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 404) {
			console.log(response.body)
		}
		expect(response.status).toEqual(404)
		expect(response.body.error.reason).toEqual('notFound')
	})

	it('fail - relative path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Ftests%2F..%2F.%2F')
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('malformedUrl')
	})

	it('succeed - export type media', async () => {
		const response = await request(app)
			.get(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fdocuments/Document.docx',
			)
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)
			.query({
				exportType: 'media',
			})

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Document.docx',
		)
		expect((response.body.content as DabbuResource).size).toEqual(
			890403,
		)
		expect(
			(response.body.content as DabbuResource).contentUri,
		).toContain('1drv.com')
	})

	it('succeed - export type view', async () => {
		const response = await request(app)
			.get(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fdocuments/Document.docx',
			)
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)
			.query({
				exportType: 'view',
			})

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Document.docx',
		)
		expect((response.body.content as DabbuResource).size).toEqual(
			890403,
		)
		expect(
			(response.body.content as DabbuResource).contentUri,
		).toContain('1drv.ms')
	})
})

describe('test create request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })

		if (response.status != 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('unauthorized')
	})

	it('fail - invalid access token', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', 'absolutely horrendously invalid token')

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - relative path', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2F..%2F.%2F/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('malformedUrl')
	})

	it('fail - no file uploaded', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('missingParam')
	})

	it('succeed - normal upload', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/pictures/Image.png')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 201) {
			console.log(response.body)
		}
		expect(response.status).toEqual(201)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Create Image Test.png',
		)
		expect((response.body.content as DabbuResource).size).toEqual(13720)
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'image/png',
		)
	})

	it('succeed - upload and set lastModifiedTime', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Last%20Modified%20Time%20Upload%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/pictures/Image.png')
			.field('lastModifiedTime', 'Thursday, 22 April 2021 06:27:05')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 201) {
			console.log(response.body)
		}
		expect(response.status).toEqual(201)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Last Modified Time Upload Image Test.png',
		)
		expect((response.body.content as DabbuResource).size).toEqual(13720)
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'image/png',
		)
		expect(
			(response.body.content as DabbuResource).lastModifiedTime,
		).toEqual(1619053025000)
	})

	it('succeed - upload and set createdAtTime', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Created%20At%20Time%20Upload%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/pictures/Image.png')
			.field('createdAtTime', 'Thursday, 22 April 2021 05:27:05')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 201) {
			console.log(response.body)
		}
		expect(response.status).toEqual(201)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Created At Time Upload Image Test.png',
		)
		expect((response.body.content as DabbuResource).size).toEqual(13720)
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'image/png',
		)
		expect(
			(response.body.content as DabbuResource).createdAtTime,
		).toEqual(1619049425000)
	})
})

describe('test update request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })

		if (response.status != 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('unauthorized')
	})

	it('fail - invalid access token', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', 'absolutely horrendously invalid token')

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - relative path', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2F..%2F.%2F/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('malformedUrl')
	})

	it('fail - no field specified for updating', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('missingParam')
	})

	it('succeed - update file content', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach(
				'content',
				'./tests/test-files/documents/Portable Doc.pdf',
			)
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Create Image Test.png',
		)
		expect((response.body.content as DabbuResource).size).toEqual(20125)
		// TODO: It seems one drive infers mime type from file extension. Find out
		// exact cause
		/*expect((response.body.content as DabbuResource).mimeType).toEqual(
      'application/pdf',
    )*/
	})

	it('succeed - update name', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.field('name', 'Updated PDF.pdf')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Updated PDF.pdf',
		)
		expect((response.body.content as DabbuResource).size).toEqual(20125)
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'application/pdf',
		)
	})

	it('succeed - update path', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Updated%20PDF.pdf',
			)
			.query({ providerId: 'one-drive' })
			.field('path', '/tests/test-files/updated/')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Updated PDF.pdf',
		)
		expect((response.body.content as DabbuResource).path).toEqual(
			'/tests/test-files/updated/Updated PDF.pdf',
		)
		expect((response.body.content as DabbuResource).size).toEqual(20125)
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'application/pdf',
		)
	})

	it('succeed - update lastModifiedTime', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fupdated/Updated%20PDF.pdf',
			)
			.query({ providerId: 'one-drive' })
			.field('lastModifiedTime', 'Thursday, 22 April 2021 06:27:05')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Updated PDF.pdf',
		)
		expect((response.body.content as DabbuResource).size).toEqual(20125)
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'application/pdf',
		)
		expect(
			(response.body.content as DabbuResource).lastModifiedTime,
		).toEqual(1619053025000)
	})

	it('succeed - update createdAtTime', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fupdated/Updated%20PDF.pdf',
			)
			.query({ providerId: 'one-drive' })
			.field('createdAtTime', 'Thursday, 22 April 2021 05:27:05')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Updated PDF.pdf',
		)
		expect((response.body.content as DabbuResource).size).toEqual(20125)
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'application/pdf',
		)
		expect(
			(response.body.content as DabbuResource).createdAtTime,
		).toEqual(1619049425000)
	})
})

describe('test delete request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.delete(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })

		if (response.status != 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('unauthorized')
	})

	it('fail - invalid access token', async () => {
		const response = await request(app)
			.delete(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', 'absolutely horrendously invalid token')

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - relative path', async () => {
		const response = await request(app)
			.delete(
				'/files-api/v3/data/%2Ftests%2F..%2F.%2F/Create%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('malformedUrl')
	})

	it('succeed - delete file', async () => {
		const response = await request(app)
			.delete(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Last%20Modified%20Time%20Upload%20Image%20Test.png',
			)
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 204) {
			console.log(response.body)
		}
		expect(response.status).toEqual(204)
	})

	it('succeed - delete folder', async () => {
		let response = await request(app)
			.delete('/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/')
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 204) {
			console.log(response.body)
		}
		expect(response.status).toEqual(204)

		response = await request(app)
			.delete('/files-api/v3/data/%2Ftests%2Ftest-files%2Fupdated/')
			.query({ providerId: 'one-drive' })
			.set('Authorization', process.env.MICROSOFT_ACCESS_TOKEN!)

		if (response.status != 204) {
			console.log(response.body)
		}
		expect(response.status).toEqual(204)
	})
})
