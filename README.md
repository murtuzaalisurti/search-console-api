# How to use

- `node .` and then hit `localhost:3000` in the browser.
- sign in with the google account when prompted.
- get the data

## Legacy approach

- 1. Call `/auth` from REST client
- 2. Copy the authURL from response and go to browser and hit the url. A success message should be shown.
- 3. Call `/data` endpoint and get the data (by property) - more on [https://developers.google.com/webmaster-tools/v1/searchanalytics/query#request-body](https://developers.google.com/webmaster-tools/v1/searchanalytics/query#request-body)
