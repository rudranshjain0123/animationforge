import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from '../server/app.js'

const origin = 'https://animationforge.example'

test('cookie-bound callback, replay prevention, private session and logout', async (t) => {
  let exchanges = 0
  const provider = {
    start: async () => ({ url: 'https://auth.hackclub.com/authorize', state: 'expected', verifier: 'verifier', nonce: 'nonce' }),
    finish: async (url, flow) => {
      exchanges++
      assert.equal(url.origin, origin)
      assert.equal(url.searchParams.get('code'), 'example')
      assert.equal(flow.verifier, 'verifier')
      return { sub: 'ident!example', name: 'Example Person', access_token: 'private' }
    },
  }
  const server = createApp({ origin, provider }).listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')
  const request = (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { redirect: 'manual', ...options })
  const started = await request('/auth/login')
  assert.equal(started.headers.get('location'), 'https://auth.hackclub.com/authorize')
  const flow = started.headers.get('set-cookie')
  assert.match(flow, /HttpOnly; Secure; SameSite=Lax/)
  const flowHeaders = { cookie: flow.split(';')[0] }
  const callback = '/auth/callback?code=example&state=expected'
  assert.equal((await request(callback)).headers.get('location'), '/?auth=failed')
  assert.equal((await request(callback + 'wrong', { headers: flowHeaders })).headers.get('location'), '/?auth=failed')
  assert.equal(exchanges, 0)
  const completed = await request(callback, { headers: flowHeaders })
  assert.equal(completed.headers.get('location'), '/')
  assert.equal(exchanges, 1)
  assert.equal((await request(callback, { headers: flowHeaders })).headers.get('location'), '/?auth=failed')
  const sessionCookie = completed.headers.getSetCookie().find((value) => value.startsWith('__Host-af-session='))
  assert.match(sessionCookie, /HttpOnly; Secure; SameSite=Lax/)
  const headers = { cookie: sessionCookie.split(';')[0] }
  const session = await (await request('/auth/session', { headers })).json()
  assert.equal(session.user.name, 'Example Person')
  assert.deepEqual(Object.keys(session.user).sort(), ['expires', 'name'])
  assert.equal((await request('/auth/logout', { method: 'POST', headers })).status, 403)
  assert.equal((await request('/auth/logout', { method: 'POST', headers: { ...headers, origin } })).status, 303)
  assert.equal((await (await request('/auth/session', { headers })).json()).user, null)
})
