# AnimationForge

AnimationForge Studio is an HTML animation editor with 125 original recipes across eight categories. The studio and dashboard require Hack Club sign-in. Downloaded animations are independent HTML/CSS documents and run offline.

## Setup and checks

Use Node.js 22.13 or newer with `node:sqlite` available.

```sh
npm ci
npm run lint
npm test
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
npm start
```

The browser suite checks every export for visible motion and distinct rendered frames, then exercises the protected workspace and project dashboard with a test identity provider. The Node suite also verifies signed-token validation against a simulated OIDC provider.

Vite's `npm run dev` is for editing frontend assets. Use `npm start` to exercise the built application and its authentication boundary. Without a configured provider, the sign-in screen reports that sign-in is unavailable. The OAuth callback requires HTTPS.

## Hack Club Nest

Keep the existing domain, HTTPS reverse proxy, systemd service, and port 3000. The proxy should send the whole site to `127.0.0.1:3000`. Set up the following in a staging checkout or during your normal release process:

1. Run `npm ci`, `npm run lint`, `npm test`, and `npm run build` with the same Node major version used by systemd.
2. Keep the production environment and client secret in their existing systemd environment file or private `.env`. Review variables against `.env.example`. The current deployment should keep:

   ```dotenv
   APP_ORIGIN=https://animationforge.rudranshjain0123.hackclub.app
   PORT=3000
   HACKCLUB_OIDC_SCOPE="openid email profile"
   ```

   Keep the existing `HACKCLUB_CLIENT_ID` and `HACKCLUB_CLIENT_SECRET`. Hack Club Auth releases the name claim with its `profile` scope. The exact registered callback remains `https://animationforge.rudranshjain0123.hackclub.app/auth/callback`. See the [official OIDC guide](https://auth.hackclub.com/docs/oidc-guide).
3. Give the systemd service user access to a private persistent writable directory for SQLite. Set `DATABASE_PATH` to an absolute file path in that directory if releases replace the checkout directory. Otherwise it defaults to `data/animationforge.sqlite` under the service working directory. Back up the database via a SQLite-aware backup method and keep it outside the HTTPS document root.
4. Keep the existing `WorkingDirectory` pointed at the release and `ExecStart` running `npm start` with Node.js 22.13+. The command starts the same `server/index.js` entry point. The server binds to localhost. Allow outbound HTTPS to `auth.hackclub.com` and exclude OAuth callback query strings from proxy access logs.
5. After approval to deploy, restart the existing unit using your Nest release process. Confirm unauthenticated visitors see sign-in and `/api/projects` returns 401. Complete a real sign-in, save a project, restart the unit, verify that the session and project survive, then sign out.

The app persists the stable Hack Club subject, display name, hashed session identifiers, projects, and favorites. It discards provider tokens after verification. Sessions expire after eight hours. Pending login transactions live in memory for ten minutes, so keep the existing single-service deployment. Sessions from the previous in-memory release require one fresh sign-in.
