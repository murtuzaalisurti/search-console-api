import { google } from 'googleapis'
import express from 'express'
import dotenv from 'dotenv'
import constants from './lib/constants.js'

const {
    PORT,
    BASE_URL,
    SEARCH_DOMAIN,
    REDIRECT_URI_SLUG,
    ANALYTICS_START_DATE,
    ANALYTICS_END_DATE
} = constants;

dotenv.config()
const app = express()

// https://console.cloud.google.com/home/dashboard?project=august-gantry-351310
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID, // client_id
    process.env.CLIENT_SECRET, // client secret
    `${BASE_URL(process.env.NODE_ENV)}/${REDIRECT_URI_SLUG}` // redirect uri
)

/**
 * ? using OAuth 2.0
 */
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

async function tryThis(callback, res) {
    try {
        await callback()
    } catch (error) {
        console.log(error)
        res.status(500).json({
            status: 500,
            error: error.message,
        })
    }
}

app.get('/', (req, res) => {
    res.redirect('/auth')
})

app.get('/auth', (req, res) => {
    tryThis(() => {
        /**
         * ? generating auth url for getting a token for the readonly scope
         */
        const authUrl = oauth2Client.generateAuthUrl({
            scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        })
        res.redirect(authUrl)
    }, res)
})

/**
 * ? the authUrl will redirect to this endpoint after successfully getting consent from the oauth sign in page
 */
app.get(`/${REDIRECT_URI_SLUG}`, async (req, res) => {
    await tryThis(async () => {
        const { tokens } = await oauth2Client.getToken(req.query.code)
        oauth2Client.setCredentials(tokens)
        res.redirect('/data')
    }, res)
})

app.get('/data', async (req, res) => {
    // https://developers.google.com/webmaster-tools/v1/searchanalytics/query#request-body
    tryThis(async () => {
        const dataOfSyntackleDotCom = await getSearchData(SEARCH_DOMAIN.com)

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
                ["Aggregated"]: Object.assign(
                    {},
                    ...Object.keys(dataOfSyntackleDotCom.data.rows[0]).map(key => {
                        if (key !== 'position') {
                            let keyValue = null;

                            if (dataOfSyntackleDotCom) {
                                keyValue = dataOfSyntackleDotCom.data.rows[0][key]
                            }

                            // append the keyvalue to other domains if needed in the future
                            // if (dataOfSyntackleDotLive) {
                            //     keyValue += dataOfSyntackleDotLive.data.rows[0][key]
                            // }

                            return {
                                [key]: keyValue
                            }
                        }
                        return null
                    })
                )
            }
        )
    }, res)
})

app.listen(PORT, () => console.log(`listening... on ${PORT}`))
