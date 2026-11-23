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

The build writes static files to `dist/`. The five animations work without a backend, database, or environment variables.

## Hack Club Auth on Nest

Hack Club Auth exposes the `name` claim through `profile`. Its documented OIDC flow does not define a `name` scope. Login stays disabled until the server configuration explicitly opts into `openid email profile`. The [official OIDC guide](https://auth.hackclub.com/docs/oidc-guide) describes the supported claims and discovery.

1. In Hack Club Auth Developer Apps, ensure the client permits `openid`, `email`, and `profile` and register this exact callback:
   `https://animationforge.rudranshjain0123.hackclub.app/auth/callback`.
2. On Nest, update your checkout and build:

   ```sh
   git pull --ff-only
   npm ci
   npm run build
   cp .env.example .env
   chmod 600 .env
   ```

   If `.env` already exists, keep it and update its settings instead of copying over it. Set `HACKCLUB_CLIENT_ID` to `8281f015ab0dc95bdf7810b64321a59e`, set `HACKCLUB_CLIENT_SECRET` to the matching secret from Developer Apps, and, if approved, set `HACKCLUB_OIDC_SCOPE="openid email profile"`. Keep the configured HTTPS origin and select an unused local `PORT`.
3. Run `npm start` from the checkout using your Nest process manager. Point the existing domain's HTTPS reverse proxy at `127.0.0.1:3000` (replace the port with your configured value). For a Caddy deployment, the site block is:

   ```caddyfile
   animationforge.rudranshjain0123.hackclub.app {
       reverse_proxy 127.0.0.1:3000
   }
   ```

   Proxy the whole site, including `/auth/callback`. The Node process serves `dist/` and handles `/auth/*`. Allow outbound HTTPS to `auth.hackclub.com`. Avoid logging callback query strings at the proxy.
4. After deployment, open the site while signed out, complete Hack Club sign-in, verify your name appears, sign out, and check that the gallery remains usable.

The server uses short-lived PKCE transactions and opaque, HTTP-only session cookies. Sessions expire after eight hours and are cleared on restart, so run a single instance. Sign out ends the AnimationForge session. Provider tokens stay server-side and are discarded after validation.

## Static deployment without sign-in

Run `npm ci && npm run build` in the checkout. Copy the contents of `dist/` to the directory your Nest static site serves. For an existing Nest static file server, set its document root to `dist/` or copy the build into its configured root. For example, from the build machine after setting `NEST_USER` and `NEST_WEB_ROOT` to your account and existing site directory:

```sh
scp -r dist/. "$NEST_USER@hackclub.app:$NEST_WEB_ROOT/"
```

Serve the built files using your existing Nest web server and domain configuration. Use Vite preview for local verification.

## Prototype scope

Springy Type, Dot Parade, Color Wipe, Orbit Pop, and Looping Ticker are available. Optional Hack Club sign-in shows the authenticated user's name. AI generation, cloud saves, and quota management are outside this prototype.
