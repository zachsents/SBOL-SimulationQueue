import fs from 'fs/promises'
import path from 'path'

import db from './mongo.mjs'
import Status from './status.mjs'

// Just for mock job
import crypto from 'crypto'

const jobsCollection = db.collection(process.env.JOB_COLLECTION)

// Set up watch stream
jobsCollection
    // .watch({ fullDocument: 'updateLookup' })
    .watch()
    .on('change', async ({operationType}) => {
    
    // only interested in new and updated documents
    if(operationType !== 'insert' && operationType !== 'update')
        return

    console.log('Detected document change.')

    // check concurrency limit
    let activeJobs = await jobsCollection.countDocuments({ status: Status.ACTIVE })
    if(activeJobs < process.env.MAX_CONCURRENT_JOBS) {
        
        // grab top of FIFO stack
        let nextJob = (await jobsCollection
            .find({ status: Status.WAITING })
            .sort({ _id: -1 })
            .limit(1)
            .toArray())[0]
        
        // check if anything was returned
        if(nextJob) {

            console.log('\tRunning job:', nextJob._id)

            // update job with Active status and time of execution
            jobsCollection.updateOne({
                _id: nextJob._id
            }, {
                $set: { status: Status.ACTIVE },
                $currentDate: { executionTime: true }
            })

            // read in associated file
            let filePath = path.join(process.cwd(), process.env.JOB_STORAGE_FOLDER, nextJob.bucketFileName)
            let fileContent = (await fs.readFile(filePath)).toString()
            console.log('\tGrabbed file from', filePath)

            // run job
            // TO DO: make iBioSim API request here
            const results = await runMockJob(fileContent)

            console.log('\tFinished job:', nextJob._id)
            console.log('\tResult:', results)

            // update job with results and Complete status
            jobsCollection.updateOne({
                _id: nextJob._id
            }, {
                $set: { 
                    status: Status.COMPLETE,
                    results
                },
                $currentDate: { completionTime: true }
            })
        }
        else
            console.log('Queue empty!')
        
    }
    else
        console.log('At concurrency limit. Ignoring event.')
})

/*
*   Dummy function that mocks a simulation
*   with a timeout
*/
function runMockJob(text = 'hello', time = 5000) {
    return new Promise(resolve => setTimeout(
        () => resolve(crypto.createHash('md5').update(text).digest('hex')),
    time))
}
