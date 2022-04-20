import { pipeline } from 'stream/promises'
import { GridFSBucket, ObjectId } from 'mongodb'
import { WritableStreamBuffer } from 'stream-buffers'
import unzipper from 'unzipper'

import db from './mongo.mjs'
import Status from './status.mjs'


const jobsCollection = db.collection(process.env.JOB_COLLECTION)
const bucket = new GridFSBucket(db)

export async function status(req, res) {

    // find document in database
    const { status } = await jobsCollection.findOne(ObjectId(req.params.jobId))

    // respond
    res.json({ status })
}

export async function zip(req, res) {

    // Retrieve document
    const document = await getDocumentIfComplete(res, req.params.jobId)
    if (!document)
        return

    // download result and pipe to response
    const downloadStream = bucket.openDownloadStream(document.result)
    await pipeline(downloadStream, res)
}

export async function data(req, res) {

    console.log('Parsing data from result.')

    // Retrieve document
    const document = await getDocumentIfComplete(res, req.params.jobId)
    if (!document)
        return

    try {
        // download result and pipe to unzipper then response
        const downloadStream = bucket.openDownloadStream(document.result)
        const streamBuffer = new WritableStreamBuffer()
        await pipeline(downloadStream, unzipper.ParseOne(/[\s\S]*mean\.tsd/), streamBuffer)

        // parse results
        const parsed = JSON.parse(
            streamBuffer.getContentsAsString()
                .replaceAll('(', '[')
                .replaceAll(')', ']')
        )
        res.json(parsed)
    }
    catch (err) {
        console.log('Cannot parse results.')
        res.json({ error: 'Cannot parse results.', file: document.result })
    }
}


async function getDocumentIfComplete(res, jobId) {

    // find document in database
    const document = await jobsCollection.findOne(ObjectId(jobId))

    if (!document) {
        res.json({ error: 'Document does not exist.' })
        return
    }

    // make sure job is complete
    if (document.status != Status.COMPLETE) {
        res.json({ error: 'Job is not complete.' })
        return
    }

    return document
}