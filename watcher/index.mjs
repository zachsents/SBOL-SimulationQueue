import fs from 'fs/promises'
import path from 'path'
import { from, fromEventPattern, mergeMap, filter } from 'rxjs'
import { GridFSBucket } from 'mongodb'
import mongoUUID from 'uuid-mongodb'
import { pipeline } from 'stream/promises'


import db from './mongo.mjs'
import Status from './status.mjs'
import { request as ibiosimRequest } from './request.mjs'


const jobsCollection = db.collection(process.env.JOB_COLLECTION)

// Create observable
const documents = fromEventPattern(handler => {
    jobsCollection.watch().on('change', handler)
})

// Set up pipeline
documents
    .pipe(
        filter(event => event.operationType == 'insert'),
        mergeMap(event => from(runJob(event)), process.env.MAX_CONCURRENT_JOBS)
    )
    .subscribe(
        results => console.log('Done. Stored results in:\n', results)
    )


/*
*   Run the job through iBioSim API
*/
async function runJob({ fullDocument }) {

    // update status of document
    await jobsCollection.updateOne({
        _id: fullDocument._id
    }, {
        $set: { status: Status.ACTIVE },
        $currentDate: { executionTime: true }
    })

    // read in associated file
    let filePath = path.join(process.cwd(), process.env.JOB_STORAGE_FOLDER, fullDocument.bucketFileName)
    let fileBuffer = await fs.readFile(filePath)

    // run job
    const response = await ibiosimRequest(fullDocument.type, fullDocument.options, fullDocument.originalFileName, fileBuffer)

    // store result in GridFS
    // TO DO: unzip file and store all components individually
    const bucket = new GridFSBucket(db)
    const uploadStream = bucket.openUploadStream(`${mongoUUID.v4().toString()}.zip`, {
        metadata: { field: 'job', value: fullDocument._id }
    })
    await pipeline(response.body, uploadStream)

    // update document with status and results
    await jobsCollection.updateOne({
        _id: fullDocument._id
    }, {
        $set: {
            status: Status.COMPLETE,
            result: uploadStream.id
        },
        $currentDate: { completionTime: true }
    })

    return uploadStream.id
}