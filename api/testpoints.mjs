import fs from 'fs/promises'
import { pipeline } from 'stream/promises'
import { ObjectId, GridFSBucket } from 'mongodb'
import path from 'path'

import db from './mongo.mjs'

/*
*   Endpoints exposed for testing during development.
*/
const jobsCollection = db.collection(process.env.JOB_COLLECTION)
const jobStorage = process.env.JOB_STORAGE_FOLDER
const bucket = new GridFSBucket(db)

// List all files saved in job storage
// process.NODE_ENV == 'development' &&
app.get('/listFiles', async (req, res) => {

    console.log('Listing files...')

    let files = await fs.readdir(
        path.join(process.cwd(), jobStorage)
    )

    console.log('Found', files.length, 'files.')

    res.json({
        found: files.length,
        files
    })
})

// List all jobs in database -- optionally read files, too
// process.NODE_ENV == 'development' &&
app.get('/listJobs', async (req, res) => {

    console.log('Listing jobs...')

    let jobs = await jobsCollection.find().toArray()

    console.log('Found', jobs.length, 'jobs.')

    // if readFiles parameter is set, return file data as well
    req.query.readFiles &&
        (jobs = await Promise.all(jobs.map(async job => {
            let fileBuffer

            try {
                // if file exists, read the buffer
                fileBuffer = Buffer.from(await fs.readFile(
                    path.join(process.cwd(), jobStorage, job.bucketFileName)
                )).toString()
            } catch (err) {
                // otherwise, return nothing
                fileBuffer = ''
            }

            return { ...job, fileBuffer }
        })))

    res.json({
        found: jobs.length,
        jobs
    })
})

// Clear jobs collection
// process.NODE_ENV == 'development' &&
app.post('/clearJobs', async (req, res) => {

    let batchSize = parseInt(req.query.batchSize) || 100
    let totalJobs = await jobsCollection.countDocuments()

    console.log(`Clearing collection "${jobsCollection.collectionName}" in batches of`, batchSize)

    // Loop through jobs in batches
    while (await jobsCollection.countDocuments() > 0) {
        let jobs = await jobsCollection.find().limit(batchSize).toArray()
        await jobsCollection.deleteMany(
            { _id: { $in: jobs.map(job => job._id) } }
        )
        console.log('Deleted a batch of', jobs.length, 'jobs.')
    }

    console.log('Done. Deleted', totalJobs, 'records.')

    res.json({ deleted: totalJobs })
})

// Clear job files
// process.NODE_ENV == 'development' &&
app.post('/clearFiles', async (req, res) => {

    console.log('Deleting all stored job files.')

    let files = (await fs.readdir(
        path.join(process.cwd(), jobStorage)
    )).map(fileName =>
        path.join(process.cwd(), jobStorage, fileName)
    )
    let totalFiles = files.length
    await Promise.all(files.map(file => fs.unlink(file)))

    console.log('Done. Deleted', totalFiles, 'files.')

    res.json({ deleted: totalFiles })
})


app.get('/file/:fileId', async (req, res) => {
    console.log('Getting file:', req.params.fileId)

    try {
        // download file and pipe to response
        const downloadStream = bucket.openDownloadStream(ObjectId(req.params.fileId))
        await pipeline(downloadStream, res)
    }
    catch (err) {
        res.json({ error: "Couldn't retrieve file." })
    }
})

app.post('/file/:fileName', async (req, res) => {
    console.log('Posting file:', req.params.fileName)

    // download file and pipe to response
    const uploadStream = bucket.openUploadStream(req.params.fileName)
    await pipeline(req, uploadStream)
    res.json({ fileId: uploadStream.id })
})

app.get('/job/:jobId', async (req, res) => {
    console.log('Getting job:', req.params.jobId)

    // find job and send response
    res.json(await jobsCollection.findOne(ObjectId(req.params.jobId)))
})
