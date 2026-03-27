# BrightNews

BrightNews is a positive-news app that surfaces credible uplifting stories from around the world without the usual doomscrolling.

## Stack

- React + Vite
- Supabase
- Capacitor for iOS and Android shells

## Local app

```bash
npm install
npm run dev
```

The local web app runs on:

- `http://localhost:5173`

## Environment

Copy `.env.example` values into `.env` and fill the real keys for:

- Supabase
- GNews
- NewsCatcher
- OpenAI review pipeline

## Main scripts

```bash
npm run dev
npm run lint
npm run build
npm run mobile:build
npm run cap:open:ios
npm run cap:open:android
npm run assets:generate
```

## News pipeline

```bash
npm run ingest:gnews
npm run ingest:gdelt
npm run ingest:newscatcher
npm run ingest:rss
npm run review:pending
npm run publish:approved
npm run refresh:news
```

## Mobile beta notes

The project already includes Capacitor shells in:

- `ios/`
- `android/`

Brand assets are generated from:

- `resources/logo.svg`

Mobile auth currently uses:

- app scheme: `com.brightnews.app`
- callback: `com.brightnews.app://auth/callback`

See [docs/mobile_beta_setup.md](docs/mobile_beta_setup.md) for the current mobile checklist.
