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
