import { pipeline } from 'stream/promises'
import { GridFSBucket, ObjectId } from 'mongodb'

import db from './mongo.mjs'
import Status from './status.mjs'


const jobsCollection = db.collection(process.env.JOB_COLLECTION)

export async function zip(req, res) {
    
    // find document in database
    const { jobId } = req.params
    const document = await jobsCollection.findOne({ _id: ObjectId(jobId) })

    // make sure job is complete
    if(!document.status == Status.COMPLETE) {
        res.json({ error: "Job is not complete." })
        return
    }
    
    // download result and pipe to response
    const bucket = new GridFSBucket(db)
    const downloadStream = bucket.openDownloadStream(document.result)
    await pipeline(downloadStream, res)
}