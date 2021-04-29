// Use express to handle HTTP requests
import * as Express from 'express'
// Use helmet to add basic security to the server
import * as Helmet from 'helmet'

// Import all the routes
import DataRouter from './routes/data.route'
import InternalRouter from './routes/internal.route'

// Import types and utility functions
import { errorHandler } from './utils/errors.util'

// Create an express server
const app = Express.default()

// Tell the server to accept JSON and Multipart Form Data
// (x-www-form-urlencoded) in the HTTP request body
app.use(Express.urlencoded({ extended: true }))
app.use(Express.json())

// Use Helmet middleware
app.use(Helmet.default())

// Register all routes
app.use('/files-api/v3/data/', DataRouter)
app.use('/files-api/v3/internal/', InternalRouter)

// Register the error handler
app.use(errorHandler)

export default app
