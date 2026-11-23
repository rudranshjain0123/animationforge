import * as oidc from 'openid-client'

const issuer = new URL('https://auth.hackclub.com')
export const supportedScope = 'openid email profile'

export function hackClubProvider({ clientId, clientSecret, origin }) {
  const redirectUri = new URL('/auth/callback', origin).href
  let discovery
  async function configuration() {
    discovery ??= oidc.discovery(issuer, clientId, {
      id_token_signed_response_alg: 'RS256',
    }, oidc.ClientSecretPost(clientSecret), {
      execute: [oidc.enableNonRepudiationChecks],
      timeout: 10,
    }).catch((error) => {
      discovery = undefined
      throw error
    })
    return discovery
  }

  return {
    async start() {
      const config = await configuration()
      const verifier = oidc.randomPKCECodeVerifier()
      const state = oidc.randomState()
      const nonce = oidc.randomNonce()
      const url = oidc.buildAuthorizationUrl(config, {
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: supportedScope,
        state,
        nonce,
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
        code_challenge_method: 'S256',
      })
      return { url: url.href, verifier, state, nonce }
    },
    async finish(callback, transaction) {
      const config = await configuration()
      const tokens = await oidc.authorizationCodeGrant(config, callback, {
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        pkceCodeVerifier: transaction.verifier,
        idTokenExpected: true,
      })
      return tokens.claims()
    },
  }
}
