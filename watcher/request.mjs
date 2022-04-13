import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'


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
    const url = path.join(process.env.IBIOSIM_URL, `${endpoint}?${params}`)

    // prepare form body
    let formData = new FormData()
    formData.append('file', fileBuffer, { filename })

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

