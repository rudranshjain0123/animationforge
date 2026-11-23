import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import test from 'node:test'
import { hackClubProvider } from '../server/oidc.js'

test('real OIDC client verifies PKCE, signature, issuer, audience and nonce', async () => {
  const issuer = 'https://auth.hackclub.com'
  const origin = 'https://animationforge.example'
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-rsa', alg: 'RS256', use: 'sig' }
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  let issueToken
  let expectedVerifier
  const provider = hackClubProvider({
    clientId: 'client-id', clientSecret: 'test-only-secret', origin,
    fetch: async (input, options) => {
      const path = new URL(input).pathname
      if (path === '/.well-known/openid-configuration') return Response.json({
        issuer, authorization_endpoint: issuer + '/local-authorize', token_endpoint: issuer + '/local-token',
        jwks_uri: issuer + '/local-jwks', id_token_signing_alg_values_supported: ['RS256'],
      })
      if (path === '/local-jwks') return Response.json({ keys: [jwk] })
      assert.equal(path, '/local-token')
      const form = new URLSearchParams(options.body)
      assert.equal(form.get('redirect_uri'), origin + '/auth/callback')
      assert.equal(form.get('client_secret'), 'test-only-secret')
      assert.equal(form.get('code_verifier'), expectedVerifier)
      return Response.json({ token_type: 'Bearer', access_token: 'not-for-the-browser', id_token: issueToken() })
    },
  })
  async function exchange(change = {}, corrupt = false) {
    const flow = await provider.start()
    expectedVerifier = flow.verifier
    const url = new URL(flow.url)
    assert.equal(url.pathname, '/local-authorize')
    assert.equal(url.searchParams.get('scope'), 'openid email profile')
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
    assert.equal(url.searchParams.get('code_challenge'), createHash('sha256').update(flow.verifier).digest('base64url'))
    issueToken = () => {
      const now = Math.floor(Date.now() / 1000)
      const payload = { sub: 'ident!user', name: 'Example Member', iss: issuer, aud: 'client-id', nonce: flow.nonce, iat: now, exp: now + 120, ...change }
      const content = encode({ alg: 'RS256', kid: 'test-rsa' }) + '.' + encode(payload)
      const signature = sign('sha256', Buffer.from(content), privateKey)
      if (corrupt) signature[0] ^= 1
      return content + '.' + signature.toString('base64url')
    }
    return provider.finish(new URL(`/auth/callback?code=example&state=${flow.state}`, origin), flow)
  }
  assert.equal((await exchange()).name, 'Example Member')
  await assert.rejects(exchange({ nonce: 'other' }))
  await assert.rejects(exchange({ iss: 'https://wrong.example' }))
  await assert.rejects(exchange({ aud: 'someone-else' }))
  await assert.rejects(exchange({ exp: 1 }))
  await assert.rejects(exchange({}, true))
})
