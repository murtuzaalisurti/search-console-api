import { google } from 'googleapis'
import express from 'express'
import dotenv from 'dotenv'
import {
    PORT,
    BASE_URL,
    SEARCH_DOMAIN,
    REDIRECT_URI_SLUG,
    ANALYTICS_START_DATE,
    ANALYTICS_END_DATE
} from './lib/constants.js'

dotenv.config()
const app = express()

// https://console.cloud.google.com/home/dashboard?project=august-gantry-351310
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID, // client_id
    process.env.CLIENT_SECRET, // client secret
    `${BASE_URL(process.env.NODE_ENV)}/${REDIRECT_URI_SLUG}` // redirect uri
)

google.options({
    auth: oauth2Client
})

async function getSearchData(domain) {
    return await google.searchconsole({ version: 'v1', auth: oauth2Client }).searchanalytics.query({
        siteUrl: `sc-domain:${domain}`,
        requestBody: {
            startDate: ANALYTICS_START_DATE,
            endDate: ANALYTICS_END_DATE,
            aggregationType: 'byProperty'
        },
    })
}

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

app.get(`/${REDIRECT_URI_SLUG}`, async (req, res) => {
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
        const dataOfSyntackleDotCom = await getSearchData(SEARCH_DOMAIN.com)
        const dataOfSyntackleDotLive = await getSearchData(SEARCH_DOMAIN.live)

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

app.listen(PORT, () => console.log(`listening... on ${PORT}`))
