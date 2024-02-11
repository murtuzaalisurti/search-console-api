import { google } from 'googleapis'
import express from 'express'
import dotenv from 'dotenv'

dotenv.config()
const app = express()

const BASE_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''
const SEARCH_DOMAIN = {
    live: 'syntackle.live',
    com: 'syntackle.com'
}

// https://console.cloud.google.com/home/dashboard?project=august-gantry-351310
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID, // client_id
    process.env.CLIENT_SECRET, // client secret
    `${BASE_URL}/oauth2callback` // redirect uri
)

google.options({
    auth: oauth2Client
})

app.get('/', (req, res) => {
    res.redirect('/auth')
})

app.get('/auth', (req, res) => {
    try {
        const authUrl = oauth2Client.generateAuthUrl({
            scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        })
        res.redirect(authUrl)
    } catch (error) {
        res.status(500).json({ 
            error: error.message
        })
    }
})

app.get('/oauth2callback', async (req, res) => {
    try {
        const { tokens } = await oauth2Client.getToken(req.query.code)
        oauth2Client.setCredentials(tokens)
        res.redirect('/data')
    } catch (error) {
        res.status(500).json({ 
            error: error.message
        })
    }
})

app.get('/data', async (req, res) => {
    // https://developers.google.com/webmaster-tools/v1/searchanalytics/query#request-body

    try {
        const dataOfSyntackleDotCom = await google.searchconsole({ version: 'v1', auth: oauth2Client }).searchanalytics.query({
            siteUrl: `sc-domain:${SEARCH_DOMAIN.com}`,
            requestBody: {
                startDate: "2022-02-15",
                endDate: `${new Date().getFullYear()}-${('0' + (new Date().getMonth() + 1)).slice(-2)}-${new Date().getDate()}`,
                aggregationType: 'byProperty'
            },
        })
    
        const dataOfSyntackleDotLive = await google.searchconsole({ version: 'v1', auth: oauth2Client }).searchanalytics.query({
            siteUrl: `sc-domain:${SEARCH_DOMAIN.live}`,
            requestBody: {
                startDate: "2022-02-15",
                endDate: `${new Date().getFullYear()}-${('0' + (new Date().getMonth() + 1)).slice(-2)}-${new Date().getDate()}`,
                aggregationType: 'byProperty'
            },
        })
        res.status(200).json(
            {
                [SEARCH_DOMAIN.com]: {
                    domain: SEARCH_DOMAIN.com,
                    data: {
                        params: {
                            ...dataOfSyntackleDotCom.config.data,
                        },
                        metrics: [
                            ...dataOfSyntackleDotCom.data.rows
                        ]
                    }
                },
                [SEARCH_DOMAIN.live]: {
                    domain: SEARCH_DOMAIN.live,
                    data: {
                        params: {
                            ...dataOfSyntackleDotLive.config.data,
                        },
                        metrics: [
                            ...dataOfSyntackleDotLive.data.rows
                        ]
                    }
                },
                "Aggregated": Object.assign(
                    {},
                    ...Object.keys(dataOfSyntackleDotCom.data.rows[0]).map(key => {
                        if (key !== 'position') {
                            return {
                                [key]: dataOfSyntackleDotCom.data.rows[0][key] + dataOfSyntackleDotLive.data.rows[0][key]
                            }
                        }
                        return null
                    })
                )
            }
        )
    } catch (error) {
        res.status(500).json({ 
            error: error.message
        })
    }
})

app.listen(3000, () => console.log("listening..."))

/**
 * ! how to use
 * SIMPLIFIED: hit localhost:3000
 * ? 1. Call /auth from REST client
 * ? 2. Copy the authURL from response and go to browser and hit the url. A success message should be shown
 * ? 3. Call /data endpoint and get the data (by property) - more on https://developers.google.com/webmaster-tools/v1/searchanalytics/query#request-body
 */