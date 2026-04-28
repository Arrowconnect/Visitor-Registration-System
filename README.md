# Arrow Pipes — Visitor Management

Reception app for **Arrow Pipes & Fittings FZCO** (Dubai, UAE).

A single-page web app where the receptionist registers visitors, and the system auto-assigns a daily badge number (1–30), logs everything to Google Sheets, and emails the host via Microsoft Outlook.

## How it works

This frontend is a single HTML file. It posts visitor data to three n8n webhook endpoints (already configured at `n8n.arrowpipes.site`). The n8n workflow handles badge assignment, Google Sheets logging, host email notifications, and 7 PM auto check-out.

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Click **Deploy** — no build settings, no env vars needed

The `vercel.json` tells Vercel to serve `index.html` as a static site. Deploys in about 30 seconds.

## Local use

Just double-click `index.html` to open it in any browser. Works the same as the deployed version since the webhooks point to a public n8n instance.

---

Internal use only — Arrow Pipes & Fittings FZCO.
