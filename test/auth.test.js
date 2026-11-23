import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from '../server/app.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStorage } from '../server/storage.js'

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

test('persistent profiles, sessions and private projects survive restarts', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'animationforge-test-'))
  t.after(() => rm(directory, { recursive: true }))
  const path = join(directory, 'test.sqlite')
  let storage = openStorage(path)
  storage.startSession('primary', 'owner', 'Owner Name', Date.now() + 60_000)
  storage.startSession('secondary', 'other', 'Other Name', Date.now() + 60_000)
  storage.startSession('expired', 'other', 'Other Name', Date.now() - 1)
  storage.close()
  storage = openStorage(path)
  const server = createApp({ origin, storage }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const request = (path, id, method = 'GET', data, sameOrigin = true) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: {
      cookie: `__Host-af-session=${id}`, 'Content-Type': 'application/json', origin: sameOrigin ? origin : 'https://other.example',
    }, body: data ? JSON.stringify(data) : undefined,
  })
  try {
    const input = { title: 'Test', effectId: 'dots', values: { count: 5 } }
    assert.equal((await request('/api/projects', 'expired')).status, 401)
    assert.equal((await request('/api/projects', 'unknown')).status, 401)
    assert.equal((await request('/api/projects', 'primary', 'POST', input, false)).status, 403)
    assert.equal((await request('/api/projects', 'primary', 'POST', { ...input, effectId: 'missing' })).status, 400)
    const created = await (await request('/api/projects', 'primary', 'POST', input)).json()
    assert.equal(created.values.count, 5)
    assert.deepEqual(await (await request('/api/projects', 'secondary')).json(), [])
    const item = `/api/projects/${created.id}`
    assert.equal((await request(item, 'secondary', 'PUT', input)).status, 404)
    assert.equal((await request(item + '/duplicate', 'secondary', 'POST')).status, 404)
    assert.equal((await request(item, 'secondary', 'DELETE')).status, 404)
    await request(item, 'primary', 'PUT', { ...input, title: 'Updated' })
    const duplicate = await (await request(item + '/duplicate', 'primary', 'POST')).json()
    assert.equal(duplicate.title, 'Updated (copy)')
    assert.equal((await request(item, 'primary', 'DELETE')).status, 204)
    assert.equal((await request('/api/favorites/dots', 'primary', 'PUT', { active: true })).status, 204)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    storage.close()
  }
  storage = openStorage(path)
  try {
    assert.equal(storage.session('primary').name, 'Owner Name')
    assert.equal(storage.list('owner')[0].title, 'Updated (copy)')
    assert.deepEqual(storage.favorites('owner'), ['dots'])
    assert.deepEqual(storage.favorites('other'), [])
  } finally { storage.close() }
})
