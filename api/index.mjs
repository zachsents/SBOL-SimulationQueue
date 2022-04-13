import fs from 'fs/promises'
import path from 'path'
import express from 'express'
import fileUpload from 'express-fileupload'
import {v4 as uuidv4} from 'uuid'

import db from './mongo.mjs'
import Status from './status.mjs'
import result from './result.mjs'


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


/*
*   Parsing and validation needed for all types of jobs
*/
function jobParsingAndValidation(req, res, next) {
    
    // grab info from request
    let {user, ...options} = req.body || {}

    console.log('\nReceived request\n\tuser:', user, '\n\toptions:', options)

    // check that there's a file
    if(!req.files) {
        res.json({ error: 'Must attach a file.' })
        return
    }

    // grab file info
    let {
        name: fileName,
        data: fileBuffer
    } = Object.values(req.files)[0]

    // generate unique file name
    let bucketFileName = `${uuidv4()}.xml`

    // expose parameters we'll need for database insertion
    req.document = {
        user,
        options,
        originalFileName: fileName,
        bucketFileName,

        // default value(s)
        status: Status.WAITING
    }

    // expose file buffer
    req.fileBuffer = fileBuffer

    next()
}


/*
*   Upload file and insert document into database
*/
async function submitJob({document, fileBuffer}, res) {
    
    // write to storage volume
    let filePath = path.join(process.cwd(), process.env.JOB_STORAGE_FOLDER, document.bucketFileName)
    await fs.writeFile(filePath, fileBuffer)

    console.log('Uploaded file:', filePath)

    // create document with data
    let {insertedId} = await db.collection(process.env.JOB_COLLECTION).insertOne(document)

    console.log('Inserted document:', insertedId.toHexString())

    // inform user of the successful addition
    res.json({
        message: 'Success',
        createdDocument: insertedId.toHexString()
    })
}


function conversionValidation(req, res, next) {
    // TO DO: make this
    next()
}

function analysisValidation(req, res, next) {
    // TO DO: make this
    next()
}

/*
*   Returns middleware-esque function that sets type
*/
function setType(type) {
    return (req, res, next) => {
        req.document.type = type;
        next()
    }
}


// Conversion endpoint
app.post(
    '/conversion',
    jobParsingAndValidation,
    conversionValidation,
    setType('convert'),
    submitJob
)

// Analysis endpoint
app.post(
    '/analysis',
    jobParsingAndValidation,
    analysisValidation,
    setType('analyze'),
    submitJob
)

// Conversion & analysis endpoint
app.post(
    '/conversion-analysis',
    jobParsingAndValidation,
    conversionValidation,
    analysisValidation,
    setType('convert_and_simulate'),
    submitJob
)

// Results endpoints
app.get('/result/:jobId/zip', result.zip)


// Include testing endpoints
process.env.NODE_ENV == 'development' &&
    import ('./testpoints.mjs')