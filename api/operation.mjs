import { ReadableStreamBuffer } from 'stream-buffers'
import { GridFSBucket } from 'mongodb'
import { pipeline } from 'stream/promises'

import db from './mongo.mjs'
import Status from './status.mjs'

/*
*   Parsing and validation needed for all types of jobs
*/
function jobParsingAndValidation(req, res, next) {

    // grab info from request
    let { user, ...options } = req.body || {}

    console.log('\nReceived request\n\tuser:', user, '\n\toptions:', options)

    // check that there's a file
    if (!req.files) {
        res.json({ error: 'Must attach a file.' })
        return
    }

    // grab file info
    let {
        name: fileName,
        data: fileBuffer
    } = Object.values(req.files)[0]

    // expose parameters we'll need for database insertion
    req.document = {
        user,
        options,
        status: Status.WAITING
    }

    // expose file name and buffer
    req.sbolFile = { fileName, fileBuffer }

    next()
}


/*
*   Upload file and insert document into database
*/
async function submitJob({ document, sbolFile }, res) {

    // Create stream from file
    const fileStream = new ReadableStreamBuffer()
    fileStream.put(sbolFile.fileBuffer)
    fileStream.stop()

    // Create upload stream for GridFS
    const bucket = new GridFSBucket(db)
    const uploadStream = bucket.openUploadStream(sbolFile.fileName, {
        // TO DO: add metadata associating file with job
        // For now, just the job has the file's ID
        // metadata: { field: 'xx', value: 'xx' }
    })
    await pipeline(fileStream, uploadStream)
    document.sbolFile = uploadStream.id
    
    console.log('Uploaded file:', uploadStream.id.toHexString())

    // create document with data
    let { insertedId } = await db.collection(process.env.JOB_COLLECTION).insertOne(document)

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

export const conversion = [
    jobParsingAndValidation,
    conversionValidation,
    setType('convert'),
    submitJob
]

export const analysis = [
    jobParsingAndValidation,
    analysisValidation,
    setType('analyze'),
    submitJob
]

export const conversionAnalysis = [
    jobParsingAndValidation,
    conversionValidation,
    analysisValidation,
    setType('convert_and_simulate'),
    submitJob
]