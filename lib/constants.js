import utils from './utils.js';

const { padSingleDigitDates } = utils;

export default {
    PORT: 3000,
    BASE_URL: (env) => env === 'development' ? 'http://localhost:3000' : '',
    REDIRECT_URI_SLUG: 'oauth2callback',
    SEARCH_DOMAIN: {
        live: 'syntackle.live',
        com: 'syntackle.com'
    },
    ANALYTICS_START_DATE: '2022-02-15',
    ANALYTICS_END_DATE: `${new Date().getFullYear()}-${padSingleDigitDates(new Date().getMonth() + 1)}-${padSingleDigitDates(new Date().getDate())}`,
}
