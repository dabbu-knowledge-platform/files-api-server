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
		url:
			'https://oauth2.googleapis.com/token' +
			`?client_id=${encodeURIComponent(
				process.env.GOOGLE_CLIENT_ID!,
			)}&client_secret=${encodeURIComponent(
				process.env.GOOGLE_CLIENT_SECRET!,
			)}&redirect_uri=${encodeURIComponent(
				process.env.GOOGLE_REDIRECT_URI!,
			)}&refresh_token=${encodeURIComponent(
				process.env.GOOGLE_REFRESH_TOKEN!,
			)}&grant_type=refresh_token`,
	})

	// Set the ACCESS_TOKEN environment variable. This variable is local, is set
	// to null once the process ends. NEVER console.log this variable
	process.env.GOOGLE_ACCESS_TOKEN = `${
		serverResponse.data.token_type || 'Bearer'
	} ${serverResponse.data.access_token}`
})

describe('test list request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F')
			.query({ providerId: 'google-drive' })

		if (response.status != 403) {
			console.log(response.body)
		}
		expect(response.status).toEqual(403)
		expect(response.body.error.reason).toEqual('unauthorized')
	})

	it('fail - invalid access token', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F')
			.query({ providerId: 'google-drive' })
			.set('Authorization', 'absolutely horrendously invalid token')

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - invalid path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Fthis-does-not-exist')
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 404) {
			console.log(response.body)
		}
		expect(response.status).toEqual(404)
		expect(response.body.error.reason).toEqual('notFound')
	})

	it('fail - relative path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2F..%2F.%2Ftests')
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('malformedUrl')
	})

	it('succeed - with access token', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Ftests%2Ftest-files')
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
	})

	it('succeed - with filter by size and order by name options', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Ftests%2Ftest-files')
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)
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
			.query({ providerId: 'google-drive' })

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
			.query({ providerId: 'google-drive' })
			.set('Authorization', 'absolutely horrendously invalid token')

		if (response.status != 401) {
			console.log(response.body)
		}
		expect(response.status).toEqual(401)
	})

	it('fail - invalid path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Ftest%2Ftest-files/non-existent-file')
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 404) {
			console.log(response.body)
		}
		expect(response.status).toEqual(404)
		expect(response.body.error.reason).toEqual('notFound')
	})

	it('fail - relative path', async () => {
		const response = await request(app)
			.get('/files-api/v3/data/%2Ftests%2F..%2F.%2F')
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)
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
		).toContain('https://www.googleapis.com/drive/v3/files/')
	})

	it('succeed - export type view', async () => {
		const response = await request(app)
			.get(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fdocuments/Document.docx',
			)
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)
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
		).toContain('https://drive.google.com/open?id=')
	})
})

describe('test create request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'google-drive' })

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
			.query({ providerId: 'google-drive' })
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
			.query({ providerId: 'google-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
			.query({ providerId: 'google-drive' })
			.attach('content', './tests/test-files/pictures/Image.png')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
			.query({ providerId: 'google-drive' })
			.attach('content', './tests/test-files/pictures/Image.png')
			.field('lastModifiedTime', 'Thursday, 22 April 2021 06:27:05')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
		).toEqual('Thu, 22 Apr 2021 00:57:05 GMT')
	})

	it('succeed - normal upload with conversion to google format', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20And%20Convert%20Test.docx',
			)
			.query({ providerId: 'google-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 201) {
			console.log(response.body)
		}
		expect(response.status).toEqual(201)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Create And Convert Test',
		)
		expect((response.body.content as DabbuResource).size).toBeFalsy()
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'application/vnd.google-apps.document',
		)
	})

	it('succeed - upload with conversion to google format and set lastModifiedTime', async () => {
		const response = await request(app)
			.post(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Last%20Modified%20Time%20Upload%20And%20Convert%20Test.docx',
			)
			.query({ providerId: 'google-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.field('lastModifiedTime', 'Thursday, 22 April 2021 06:27:05')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 201) {
			console.log(response.body)
		}
		expect(response.status).toEqual(201)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Last Modified Time Upload And Convert Test',
		)
		expect((response.body.content as DabbuResource).size).toBeFalsy()
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'application/vnd.google-apps.document',
		)
		expect(
			(response.body.content as DabbuResource).lastModifiedTime,
		).toEqual('Thu, 22 Apr 2021 00:57:05 GMT')
	})
})

describe('test update request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Testpng',
			)
			.query({ providerId: 'google-drive' })

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
			.query({ providerId: 'google-drive' })
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
			.query({ providerId: 'google-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
			.query({ providerId: 'google-drive' })
			.attach(
				'content',
				'./tests/test-files/documents/Portable Doc.pdf',
			)
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 200) {
			console.log(response.body)
		}
		expect(response.status).toEqual(200)
		expect((response.body.content as DabbuResource).name).toEqual(
			'Create Image Test.png',
		)
		expect((response.body.content as DabbuResource).size).toEqual(20125)
		expect((response.body.content as DabbuResource).mimeType).toEqual(
			'application/pdf',
		)
	})

	it('succeed - update name', async () => {
		const response = await request(app)
			.patch(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Test.png',
			)
			.query({ providerId: 'google-drive' })
			.field('name', 'Updated PDF.pdf')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
			.query({ providerId: 'google-drive' })
			.field('path', '/tests/test-files/updated/')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
			.query({ providerId: 'google-drive' })
			.field('lastModifiedTime', 'Thursday, 22 April 2021 06:27:05')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

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
		).toEqual('Thu, 22 Apr 2021 00:57:05 GMT')
	})
})

describe('test delete request', () => {
	it('fail - no access token', async () => {
		const response = await request(app)
			.delete(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Create%20Image%20Testpng',
			)
			.query({ providerId: 'google-drive' })

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
			.query({ providerId: 'google-drive' })
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
			.query({ providerId: 'google-drive' })
			.attach('content', './tests/test-files/documents/Document.docx')
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 400) {
			console.log(response.body)
		}
		expect(response.status).toEqual(400)
		expect(response.body.error.reason).toEqual('malformedUrl')
	})

	it('succeed - delete file', async () => {
		const response = await request(app)
			.delete(
				'/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/Last%20Modified%20Time%20Upload%20And%20Convert%20Test',
			)
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 204) {
			console.log(response.body)
		}
		expect(response.status).toEqual(204)
	})

	it('succeed - delete folder', async () => {
		let response = await request(app)
			.delete('/files-api/v3/data/%2Ftests%2Ftest-files%2Fuploads/')
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		response = await request(app)
			.delete('/files-api/v3/data/%2Ftests%2Ftest-files%2Fupdated/')
			.query({ providerId: 'google-drive' })
			.set('Authorization', process.env.GOOGLE_ACCESS_TOKEN!)

		if (response.status != 204) {
			console.log(response.body)
		}
		expect(response.status).toEqual(204)
	})
})
