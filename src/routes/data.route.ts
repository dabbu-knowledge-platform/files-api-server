// Routes related to listing, downloading, creating, updating and deleting user
// data (files and folders)

// Use express to handle HTTP requests
import * as Express from 'express'
// Use multer to handle file upload for POST and PATCH requests
import Multer from 'multer'
// Use the env paths library to get the local cache path
import EnvPaths from 'env-paths'

// Import the DataController to parse the request and call the appropriate
// provider module as specified in the request
import * as DataController from '../controllers/data.controller'

// Define where multer should store the uploaded files
const multer = Multer({
	dest: EnvPaths('Dabbu Server', { suffix: '' }).cache,
})

// All the routes for the /data endpoint
const router = Express.Router()

// If the user makes a GET request to /data/:folderPath/, list
// out all the files/subfolders in the specified folder
router.get('/:folderPath/', DataController.list)
// If the user makes a GET request to /data/:folderPath/:fileName,
// return information about the file at that specified location
router.get('/:folderPath/:fileName/', DataController.read)
// If the user makes a POST request to /data/:folderPath/:fileName,
// upload the given file to that specified location
router.post(
	'/:folderPath/:fileName/',
	multer.single('content'),
	DataController.create,
)
// If the user makes a PATCH request to /data/:folderPath/:fileName,
// update the file at that specified location
router.patch(
	'/:folderPath/:fileName/',
	multer.single('content'),
	DataController.update,
)
// If the user makes a DELETE request to /data/:folderPath/
// :fileName, delete the file/folder at that specified location
router.delete('/:folderPath/:fileName?/', DataController.del)

export default router
