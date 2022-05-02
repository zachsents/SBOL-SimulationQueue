import { from, fromEventPattern, mergeMap, filter } from 'rxjs'
import { GridFSBucket, ObjectId } from 'mongodb'
import { pipeline } from 'stream/promises'


import db from './mongo.mjs'
import Status from './status.mjs'
import { request as ibiosimRequest } from './request.mjs'
import { WritableStreamBuffer } from 'stream-buffers'


const jobsCollection = db.collection(process.env.JOB_COLLECTION)
const bucket = new GridFSBucket(db)

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
        result => console.log('Done. Stored results in:\n', result.toHexString())
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

    // download SBOL file to buffer
    const downloadStream = bucket.openDownloadStream(fullDocument.sbolFile)
    const streamBuffer = new WritableStreamBuffer()
    await pipeline(downloadStream, streamBuffer)

    // run job
    const response = await ibiosimRequest(
        fullDocument.type,
        fullDocument.options,
        'sbol.xml',
        streamBuffer.getContents()
    )

    // store result in GridFS
    // TO DO: unzip file and store all components individually
    const uploadStream = bucket.openUploadStream('result.zip', {
        metadata: { field: 'job', value: fullDocument._id }
    })
    await pipeline(response.body, uploadStream)

    // update document with status and results
    await jobsCollection.updateOne({
        _id: fullDocument._id
    }, {
        $set: {
            status: Status.COMPLETE,
            // result: uploadStream.id
            result: ObjectId('625889ed60085ff0c50b1c59')     // points to ToggleSwitch.zip
        },
        $currentDate: { completionTime: true }
    })
    console.log('Subbed out results for ToggleSwitch.zip')

    return uploadStream.id
}