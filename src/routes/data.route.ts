// Routes related to listing, downloading, creating, updating and deleting user
// data (files and folders)

// Use express to handle HTTP requests
import * as Express from 'express'
// Use multer to handle file upload for POST and PUT requests
import Multer from 'multer'
// Use the env paths library to get the local cache path
import EnvPaths from 'env-paths'
const cachePath = EnvPaths('Dabbu Files API Server', {
	suffix: '',
}).cache

// Import the DataController to parse the request and call the appropriate
// provider module as specified in the request
import * as DataController from '../controllers/data.controller'

// Import the auth middleware
import AuthHandler from '../utils/auth.util'

// Define where multer should store the uploaded files
const multer = Multer({
	dest: `${cachePath}/uploads/`,
})

// All the routes for the /data endpoint
const router = Express.Router()

// If the user makes a GET request to /data/:folderPath/, list
// out all the files/subfolders in the specified folder
router.get('/:folderPath/', AuthHandler, DataController.list)
// If the user makes a GET request to /data/:folderPath/:fileName,
// return information about the file at that specified location
router.get('/:folderPath/:fileName/', AuthHandler, DataController.read)
// If the user makes a POST request to /data/:folderPath/:fileName,
// upload the given file to that specified location
router.post(
	'/:folderPath/:fileName/',
	multer.single('content'),
	AuthHandler,
	DataController.create,
)
// If the user makes a PUT request to /data/:folderPath/:fileName,
// update the file at that specified location
router.put(
	'/:folderPath/:fileName/',
	multer.single('content'),
	AuthHandler,
	DataController.update,
)
// If the user makes a DELETE request to /data/:folderPath/
// :fileName, delete the file/folder at that specified location
router.delete(
	'/:folderPath/:fileName?/',
	AuthHandler,
	DataController.del,
)

export default router
