// Routes related to client X-Provider-Credentials

// Use express to handle HTTP requests
import * as Express from 'express'

// Import the AuthController to parse the request and execute it
import * as AuthController from '../controllers/auth.controller'

// Import the auth middleware
import AuthHandler from '../utils/auth.util'

// All the routes for the /clients endpoint
const router = Express.Router()

// If the user makes a POST request to /clients, send back a client ID
// and API key
router.post('/', AuthController.create)

// If the user makes a POST request to /clients/:clientId, revoke the
// current API key and returns a new one
router.post('/:clientId/', AuthHandler, AuthController.replace)

// If the user makes a DELETE request to /clients/:clientId, delete the
// client and the API key
router.delete('/:clientId/', AuthHandler, AuthController.revoke)

export default router
