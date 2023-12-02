import { google } from 'googleapis'
import { searchconsole } from '@googleapis/searchconsole'
import express from 'express'
import dotenv from 'dotenv'

dotenv.config()
const app = express()

// https://console.cloud.google.com/home/dashboard?project=august-gantry-351310
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID, // client_id
    process.env.CLIENT_SECRET, // client secret
    'http://localhost:3000/oauth2callback' // redirect uri
)

google.options({
    auth: oauth2Client
})

app.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    });
    res.json({
        url: authUrl
    })
})

app.get('/oauth2callback', async (req, res) => {
    try {
        const { tokens } = await oauth2Client.getToken(req.query.code);
        oauth2Client.setCredentials(tokens);;
        res.json({
            code: 200,
            message: "success"
        })
    } catch (error) {
        res.json({
            code: 400,
            message: "failure"
        })
    }
})

app.get('/data', async (req, res) => {
    // https://developers.google.com/webmaster-tools/v1/searchanalytics/query#request-body
    const data = await searchconsole({version: 'v1', auth: oauth2Client}).searchanalytics.query({
        siteUrl: "sc-domain:syntackle.live",
        requestBody: {
            startDate: "2022-02-15",
            endDate: "2023-12-01",
            aggregationType: 'byProperty'
        },
    })
    res.json(data)
})

app.listen(3000, () => console.log("listening..."))

/**
 * ! how to use
 * ? 1. Call /auth from REST client
 * ? 2. Copy the authURL from response and go to browser and hit the url. A success message should be shown
 * ? 3. Call /data endpoint and get the data (by property) - more on https://developers.google.com/webmaster-tools/v1/searchanalytics/query#request-body
 */