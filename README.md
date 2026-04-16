# BrightNews

BrightNews is a calmer news app focused on positive, uplifting stories from around the world.

Instead of doomscrolling through war, political chaos, and economic panic, BrightNews highlights progress in science, health, communities, environment, animals, and innovation.

## What It Includes

- curated positive-news feed
- region-based discovery
- save and share actions
- localized app interface
- web app plus Capacitor-based mobile shells

## Tech Stack

- React
- Vite
- Supabase
- Capacitor

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Default local URL:

- `http://localhost:5173`

## Common Scripts

```bash
npm run dev
npm run lint
npm run build
npm run mobile:build
npm run cap:open:ios
npm run cap:open:android
npm run assets:generate
```

## Web Deployment

BrightNews can be deployed on Vercel as a standard Vite app.

Required hosted-web environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WEB_AUTH_REDIRECT_URL`

See [docs/vercel_deploy.md](./docs/vercel_deploy.md) for the exact setup and public URLs.

## Environment

Create a local `.env` file and add the required project keys for the services used by the app.

At minimum, local development expects app configuration for:

- Supabase
- external news/content providers used by the project

## Project Structure

- `src/`: app UI and shared frontend logic
- `public/`: static public pages and assets
- `android/`: Android shell
- `ios/`: iOS shell
- `resources/`: branding and generated app assets
- `docs/`: supporting project documentation

## Status

BrightNews is under active development and is currently being refined for wider public release.
