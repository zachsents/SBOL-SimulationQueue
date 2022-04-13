
import express from 'express'
import fileUpload from 'express-fileupload'

import { conversion, analysis, conversionAnalysis } from './operation.mjs'
import { zip } from './result.mjs'


// Set up express, globalize app variable
global.app = express()

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
app.get('/result/:jobId/zip', zip)


// Conditionally include testing endpoints in development
process.env.NODE_ENV == 'development' &&
    import('./testpoints.mjs')