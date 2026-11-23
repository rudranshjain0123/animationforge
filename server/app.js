import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { openStorage } from './storage.js'
import { projectRoutes } from './projects.js'
import { revealScript } from '../src/reveal-script.js'

const revealHash = createHash('sha256').update(`\n${revealScript}\n`).digest('base64')

const token = () => randomBytes(32).toString('base64url')
const transactionAge = 10 * 60 * 1000
const sessionAge = 8 * 60 * 60 * 1000
const transactionCookie = '__Host-af-oidc'
const sessionCookie = '__Host-af-session'
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' }

function cookie(req, name) {
  return req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(name + '='))?.slice(name.length + 1)
}

function equalState(received, expected) {
  if (typeof received !== 'string' || received.length !== expected.length) return false
  const value = Buffer.from(received)
  const target = Buffer.from(expected)
  return value.length === target.length && timingSafeEqual(value, target)
}

function prune(store) {
  for (const [key, value] of store) if (value.expires <= Date.now()) store.delete(key)
}

export function createApp({ origin, provider, storage = openStorage() }) {
  const app = express()
  const transactions = new Map()
  const activeSession = (req) => storage.session(cookie(req, sessionCookie))
  const dist = fileURLToPath(new URL('../dist/', import.meta.url))
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': `default-src 'self'; script-src 'self' 'sha256-${revealHash}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
    })
    next()
  })
  app.use('/auth', (_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
    next()
  })

  app.get('/auth/session', (req, res) => {
    const session = activeSession(req)
    res.json({ enabled: Boolean(provider), user: session ? { name: session.name, expires: session.expires } : null })
  })

  app.get('/auth/login', async (req, res) => {
    if (!provider) return res.redirect(303, '/?auth=unavailable')
    prune(transactions)
    transactions.delete(cookie(req, transactionCookie))
    if (transactions.size >= 1000) return res.redirect(303, '/?auth=unavailable')
    try {
      const flow = await provider.start()
      if (transactions.size >= 1000) return res.redirect(303, '/?auth=unavailable')
      const id = token()
      transactions.set(id, { ...flow, expires: Date.now() + transactionAge })
      res.cookie(transactionCookie, id, { ...cookieOptions, maxAge: transactionAge })
      return res.redirect(303, flow.url)
    } catch {
      return res.redirect(303, '/?auth=failed')
    }
  })

  app.get('/auth/callback', async (req, res) => {
    const id = cookie(req, transactionCookie)
    const flow = transactions.get(id)
    if (!provider || !flow || flow.expires <= Date.now() || !equalState(req.query.state, flow.state)) {
      return res.redirect(303, '/?auth=failed')
    }
    transactions.delete(id)
    res.clearCookie(transactionCookie, cookieOptions)
    if (req.query.error === 'access_denied') return res.redirect(303, '/?auth=cancelled')
    try {
      const callback = new URL('/auth/callback', origin)
      callback.search = new URL(req.originalUrl, origin).search
      const claims = await provider.finish(callback, flow)
      const name = typeof claims?.name === 'string' ? claims.name.trim().slice(0, 160) : ''
      if (typeof claims?.sub !== 'string' || !claims.sub || !name) return res.redirect(303, '/?auth=failed')
      storage.endSession(cookie(req, sessionCookie))
      const sessionId = token()
      storage.startSession(sessionId, claims.sub, name, Date.now() + sessionAge)
      res.cookie(sessionCookie, sessionId, { ...cookieOptions, maxAge: sessionAge })
      return res.redirect(303, '/')
    } catch {
      return res.redirect(303, '/?auth=failed')
    }
  })

  app.post('/auth/logout', (req, res) => {
    if (req.get('origin') !== origin) return res.sendStatus(403)
    storage.endSession(cookie(req, sessionCookie))
    transactions.delete(cookie(req, transactionCookie))
    res.clearCookie(sessionCookie, cookieOptions)
    res.clearCookie(transactionCookie, cookieOptions)
    return res.redirect(303, '/')
  })

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    const session = activeSession(req)
    if (!session) return res.sendStatus(401)
    if (!['GET', 'HEAD'].includes(req.method) && req.get('origin') !== origin) return res.sendStatus(403)
    res.locals.subject = session.subject
    next()
  }, express.json({ limit: '12kb' }), projectRoutes(storage))
  app.use('/assets', express.static(dist + 'assets', { index: false, immutable: true, maxAge: '1y' }))
  app.get(['/', '/index.html', '/projects'], (req, res) => {
    res.set('Cache-Control', 'no-store')
    return res.sendFile(activeSession(req) ? 'index.html' : 'login.html', { root: dist })
  })
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error)
    const status = error.status >= 400 && error.status < 500 ? error.status : 500
    if (status === 500) console.error('AnimationForge request failed:', error.code || error.name)
    res.status(status).json({ error: status === 500 ? 'Unexpected server error.' : 'Invalid request.' })
  })
  return app
}
