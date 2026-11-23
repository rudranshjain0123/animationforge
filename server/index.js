import { createApp } from './app.js'
import { hackClubProvider, supportedScope } from './oidc.js'
import { openStorage } from './storage.js'

const settings = process.env
const site = new URL(settings.APP_ORIGIN || 'http://localhost:3000')
const origin = site.origin
const validOrigin = site.protocol === 'https:' && site.href === origin + '/'
  && !site.username && !site.password
const provider = validOrigin && settings.HACKCLUB_CLIENT_ID && settings.HACKCLUB_CLIENT_SECRET
  && settings.HACKCLUB_OIDC_SCOPE === supportedScope
  ? hackClubProvider({ clientId: settings.HACKCLUB_CLIENT_ID, clientSecret: settings.HACKCLUB_CLIENT_SECRET, origin })
  : undefined

const port = Number(settings.PORT || 3000)
process.umask(0o077)
const storage = openStorage(settings.DATABASE_PATH || 'data/animationforge.sqlite')
createApp({ origin, provider, storage }).listen(port, '127.0.0.1', () => {
  console.log(`AnimationForge listening on 127.0.0.1:${port}. Hack Club login ${provider ? 'configured' : 'disabled'}.`)
})
