
/*
*   Live readout for waiting, active, and completed jobs.
*   Intended to be ran inside Watcher container.
*/

import db from './mongo.mjs'
import asciichart from 'asciichart'

let col = db.collection('jobs')

let data = {
    waiting: [0],
    active: [0],
    complete: [0]
}

let plotConfig = {
    colors: [
        asciichart.blue,
        asciichart.green,
        asciichart.red
    ],
    height: 20
}

// Interval to update data
setInterval(() => {
    Object.entries(data).forEach(async ([status, arr]) => {
        arr.push(await col.countDocuments({status}))
        while(arr.length > 60)
            arr.shift()
    })
}, 250)

// Interval to update plot
setInterval(() => {
    let plotContent = asciichart.plot(Object.values(data), plotConfig)
    console.clear()
    console.log('\n\n\n\n')
    console.log(plotContent)
}, 500)