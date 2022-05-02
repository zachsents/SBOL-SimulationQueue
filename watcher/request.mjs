import path from 'path'
import fetch from 'node-fetch'
import { FormData, Blob } from 'formdata-node'


export async function convert(options, filename, fileBuffer) {
    request('convert', options, filename, fileBuffer)
}

export async function analyze(options, filename, fileBuffer) {
    request('analyze', options, filename, fileBuffer)
}

export async function convertAndAnalyze(options, filename, fileBuffer) {
    request('convert_and_simulate', options, filename, fileBuffer)
}

export async function request(endpoint, options, filename, fileBuffer) {

    // format options & create request URL
    const params = Object.entries(options).map(e => e.join('=')).join('&')
    const url = process.env.IBIOSIM_URL + `/${endpoint}?${params}`

    console.log('Requesting URL\n', url)

    // prepare form body
    let formData = new FormData()
    formData.append('file', new Blob([ fileBuffer ]), filename)
    
    // make the request
    let response
    try {
        response = await fetch(url, {
            header: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData,
            method: 'post'
        })
    }
    catch (e) {
        console.error(e.toString())
        response = { body: e.toString() }
    }

    return response
}

