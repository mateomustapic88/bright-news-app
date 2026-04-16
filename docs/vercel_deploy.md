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
- `VITE_WEB_AUTH_REDIRECT_URL`

Set `VITE_WEB_AUTH_REDIRECT_URL` to your final Vercel production URL, for example:

```env
VITE_WEB_AUTH_REDIRECT_URL=https://brightnews.vercel.app
```

If you later attach a custom domain, update the value to that final domain instead.

## Supabase auth configuration

In Supabase `Authentication -> URL Configuration`, add the hosted web app URL:

- `https://brightnews.vercel.app`

If you later switch to a custom domain, add that domain too.

## Public web URLs to use

Once the app is live on Vercel, use these URLs instead of any previous GitHub Pages links:

- App homepage: `https://brightnews.vercel.app/`
- Privacy policy: `https://brightnews.vercel.app/privacy-policy.html`
- Support: `https://brightnews.vercel.app/support.html`
- Account deletion: `https://brightnews.vercel.app/account-deletion.html`

Replace the hostname with your real Vercel project URL if you choose a different project name.

## Recommended follow-up updates

After deployment, update:

- Google Play Store listing URLs
- Indiegogo campaign links
- Supabase auth redirect URLs
- any external README/docs references you want to share publicly

## Notes

- The app already uses relative legal-page links, so those pages will work automatically once deployed.
- The app already falls back to `window.location.origin` for web auth redirects, but setting `VITE_WEB_AUTH_REDIRECT_URL` is still the safer production setup.
