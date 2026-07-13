# BrightNews Web Deployment on Vercel

This project is ready to deploy on Vercel as a static Vite app.

## Vercel project settings

Use these values when importing the repository into Vercel:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## Required environment variables

Add these in the Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase auth configuration

In Supabase `Authentication -> URL Configuration`, add the hosted web app URL:

- `https://brightnews.app`

## Public web URLs to use

Use these production URLs:

- App homepage: `https://brightnews.app/`
- Privacy policy: `https://brightnews.app/privacy-policy.html`
- Support: `https://brightnews.app/support.html`
- Account deletion: `https://brightnews.app/account-deletion.html`

## Recommended follow-up updates

After deployment, update:

- Google Play Store listing URLs
- Indiegogo campaign links
- Supabase auth redirect URLs
- any external README/docs references you want to share publicly

## Notes

- The app already uses relative legal-page links, so those pages will work automatically once deployed.
- Web authentication returns to the origin where the user started signing in, such as `https://brightnews.app`.
