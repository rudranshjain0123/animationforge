# AnimationForge

A responsive Motion Code playground with five animations. Customize effects, preview them live, and copy or download standalone HTML and CSS.

## Install and run

Use Node.js 20.19+ on the 20.x line, or 22.12+.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite.

## Checks and production build

```sh
npm run lint
npm test
npm run build
npm run preview
```

The build writes static files to `dist/`. No backend, database, or environment variables are required.

## Deploy later to Hack Club Nest

Run `npm ci && npm run build` in the checkout. Copy the contents of `dist/` to the directory your Nest static site serves. For an existing Nest static file server, set its document root to `dist/` or copy the build into its configured root. For example, from the build machine after setting `NEST_USER` and `NEST_WEB_ROOT` to your account and existing site directory:

```sh
scp -r dist/. "$NEST_USER@hackclub.app:$NEST_WEB_ROOT/"
```

Serve the built files using your existing Nest web server and domain configuration. Use Vite preview for local verification.

## Prototype scope

Springy Type, Dot Parade, Color Wipe, Orbit Pop, and Looping Ticker are available. AI generation, accounts, cloud saves, and quota management are outside this prototype.
