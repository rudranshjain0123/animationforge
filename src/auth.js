const login = document.getElementById('auth-login')
const account = document.getElementById('auth-account')
const name = document.getElementById('auth-name')
const notice = document.getElementById('auth-status')
const url = new URL(location.href)
const result = url.searchParams.get('auth')
const messages = new Map([
  ['failed', 'Sign-in failed. Please try again.'],
  ['cancelled', 'Sign-in cancelled.'],
  ['unavailable', 'Hack Club sign-in is currently unavailable.'],
])
if (messages.has(result)) {
  notice.textContent = messages.get(result)
  url.searchParams.delete('auth')
  history.replaceState(null, '', url)
}

let expiryTimer
async function refresh() {
  clearTimeout(expiryTimer)
  try {
    const response = await fetch('/auth/session', { cache: 'no-store' })
    if (!response.ok) return
    const { enabled, user } = await response.json()
    login.hidden = !enabled || Boolean(user)
    account.hidden = !user
    name.textContent = user?.name ?? ''
    if (user) expiryTimer = setTimeout(() => {
      account.hidden = true
      name.textContent = ''
      login.hidden = !enabled
    }, Math.max(0, user.expires - Date.now()))
  } catch {
    // The animation library also runs on static hosting.
  }
}

refresh()
window.addEventListener('pageshow', (event) => { if (event.persisted) refresh() })
