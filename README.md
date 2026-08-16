# Sandman Services Ticket Processing Portal

Professional version of the Sandman ticket extraction website.

## Features
- Professional Sandman Services branding
- Drag-and-drop upload
- PDF/JPG/PNG support
- Multiple ticket files
- AI handwriting extraction
- Editable review table
- Excel export
- Mobile-friendly layout
- Server-side API key
- Uses `gpt-5-mini` by default

## GitHub / Vercel update
Replace your current project files with:

- `index.html`
- `api/extract.js`
- `vercel.json`

Keep your existing Vercel `OPENAI_API_KEY` environment variable.

`vercel.json` should remain:

```json
{}
```

Commit the changes to GitHub. Vercel should automatically redeploy.

## Sharing
You can share the Vercel production URL with another person. They do not need your OpenAI key. Their ticket processing will use the API balance attached to your server-side key.

For wider sharing, add authentication or a password so random users cannot consume your API credits.


## Secure login setup

Add these Vercel environment variables:

- `SITE_USERNAME` = `sandman`
- `SITE_PASSWORD` = your private password
- `SITE_AUTH_TOKEN` = a long random secret string, for example 40+ random characters

Keep your existing:

- `OPENAI_API_KEY`
- optionally `OPENAI_MODEL=gpt-5-mini`

Do not put the password or auth token in GitHub.


## Installable mobile app (PWA)

Android: open the production site in Chrome and use **Install App** or Chrome menu → **Add to Home screen**.

iPhone/iPad: open the production site in Safari → Share → **Add to Home Screen**.

The installed app opens in standalone mode. Ticket extraction still requires internet access because it uses the secure server backend.


## Automatic standardization
This version matches extracted values to approved Jobs, Trucks, Vendors/Shippers, and Materials. LGC becomes LGC Global; EGT in FROM makes Shipper ED Giraud. Truck/ID matching is intentionally strict.


## Google Sheets integration

This build includes both:

- **Save to Google Sheets**
- **Download Excel**

The Google Sheets route submits the reviewed table through `/api/sheets`, which forwards the data to a Google Apps Script Web App.

New Vercel variables:

- `GOOGLE_SHEETS_WEBAPP_URL`
- `GOOGLE_SHEETS_SECRET`

See `GOOGLE_SHEETS_SETUP.txt` and `GOOGLE_APPS_SCRIPT.gs`.


## PDF Project Sorter

New feature:
- Upload one combined multi-page PDF or multiple PDFs.
- The app reads each page's Job/Project #.
- Pages are grouped into one PDF per approved project.
- Any blank/unrecognized/other pit-ticket pages are grouped into `Other Pit Tickets.pdf`.
- Download an individual project PDF or a ZIP containing all separated PDFs.

The sorter uses `/api/classify.js` and therefore uses OpenAI API credits once per page.
The actual original PDF page is copied into the separated file; it is not converted to an image.

Current approved project values are defined in `api/classify.js`.
