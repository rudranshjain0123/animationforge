import './style.css'

const status = document.getElementById('auth-status')
const address = new URL(location.href)
const messages = {
  failed: 'Sign-in failed. Please try again.',
  cancelled: 'Sign-in cancelled.',
  unavailable: 'Hack Club sign-in is currently unavailable.',
}
const result = address.searchParams.get('auth')
address.searchParams.delete('auth')
history.replaceState(null, '', address)
try {
  const response = await fetch('/auth/session')
  const { enabled } = await response.json()
  document.getElementById('auth-login').hidden = !enabled
  status.textContent = enabled ? (Object.hasOwn(messages, result) ? messages[result] : '') : messages.unavailable
} catch {
  status.textContent = messages.unavailable
}
