# Sandman Ticket → Excel — Secure Version

This version does **not** ask for an OpenAI API key in the webpage.

The browser sends ticket images to `/api/extract`. The serverless backend calls OpenAI using the `OPENAI_API_KEY` environment variable.

## Recommended deployment: GitHub + Vercel

GitHub Pages alone cannot securely hide an API secret because it only hosts static files.

### 1. Upload this project to GitHub

Your repository should contain:

- `index.html`
- `api/extract.js`
- `vercel.json`
- `package.json`

### 2. Create an OpenAI API key

Create a key in your OpenAI Platform account. Do not put it inside `index.html` or `api/extract.js`.

### 3. Deploy the GitHub repository to Vercel

- Sign in at Vercel.
- Select **Add New → Project**.
- Import your GitHub repository.
- Keep the normal project defaults.

### 4. Add the secret key in Vercel

In the Vercel project:

**Settings → Environment Variables**

Add:

Name:
`OPENAI_API_KEY`

Value:
your OpenAI API key

Optional:

Name:
`OPENAI_MODEL`

Value:
`gpt-5`

Apply the variables to Production, Preview, and Development if desired.

### 5. Redeploy

Redeploy the project after adding the environment variable.

Your final Vercel URL will look similar to:

`https://your-project-name.vercel.app`

Open that URL and upload PDFs. The webpage will no longer ask for an API key.

## Important security note

Never commit an API key to GitHub. Keep it only in Vercel Environment Variables.

## Current ticket rules

Columns:

Date, Ticket #, Shipper, Customer, Job #, From, Location, Truck #, Pit/Dump Vendor, Pit Ticket #, Driver, Time Start, Time Quit, Time Type, Material Type, Quantity

Defaults:

- Shipper → Sandman when blank
- Pit/Dump Vendor → Sandman when blank
- Time Type → Demurrage when Start or Quit contains a time
- Pit Ticket # → blank when missing
