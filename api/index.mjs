
import express from 'express'
import fileUpload from 'express-fileupload'
import cors from 'cors'

import { conversion, analysis, conversionAnalysis } from './operation.mjs'
import { status, zip, data } from './result.mjs'


// Set up express, globalize app variable
global.app = express()

// CORS middleware
app.use(cors())

// File-handling middleware
app.use(fileUpload({
    limits: {}
}))

// Listen on specified port
app.listen(process.env.EXPRESS_PORT, () => {
    console.log('Simulations API running.')
})


// Conversion endpoint
app.post('/conversion', ...conversion)

// Analysis endpoint
app.post('/analysis', ...analysis)

// Conversion & analysis endpoint
app.post('/conversion-analysis', ...conversionAnalysis)


// Results endpoints
app.get('/status/:jobId', status)
app.get('/result/:jobId/zip', zip)
app.get('/result/:jobId/data', data)

// Conditionally include testing endpoints in development
process.env.NODE_ENV == 'development' &&
    import('./testpoints.mjs')