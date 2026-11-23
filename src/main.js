import './style.css'
import './auth.js'
import { defaults, effects, exportHtml, renderEffect } from './effects.js'

const byId = (id) => document.getElementById(id)
const cards = byId('cards')
const controls = byId('controls')
const preview = byId('preview')
const playback = byId('playback')
const status = byId('status')
let selected
let values
let paused = false

const styles = document.createElement('style')
styles.textContent = effects.map((effect) => renderEffect(effect).css).join('\n')
document.head.append(styles)

function syncPlayback() {
  preview.firstElementChild.toggleAttribute('data-paused', paused)
  playback.textContent = paused ? 'Play' : 'Pause'
}

function update() {
  preview.innerHTML = renderEffect(selected, values).markup
  byId('source').textContent = exportHtml(selected, values)
  syncPlayback()
}

function select(effect, focus = false) {
  selected = effect
  values = defaults(effect)
  paused = false
  status.textContent = ''
  const title = byId('effect-title')
  title.textContent = effect.name
  for (const card of cards.children) card.setAttribute('aria-pressed', String(card.dataset.effect === effect.id))
  controls.replaceChildren()
  for (const [key, field] of Object.entries(effect.controls)) {
    const label = document.createElement('label')
    const caption = document.createElement('span')
    caption.textContent = field.label
    const input = document.createElement('input')
    input.type = field.type
    if (field.type === 'text') input.maxLength = 40
    if (field.type === 'range') {
      input.min = field.min
      input.max = field.max
      input.step = field.step
    }
    input.value = field.value
    const output = document.createElement('output')
    if (field.type === 'range') output.value = input.value
    input.addEventListener('input', () => {
      values[key] = field.type === 'range' ? input.valueAsNumber : input.value
      if (field.type === 'range') output.value = input.value
      status.textContent = ''
      update()
    })
    label.append(caption, output, input)
    controls.append(label)
  }
  update()
  if (focus && matchMedia('(max-width: 850px)').matches) title.focus()
}

const observer = typeof IntersectionObserver === 'function'
  ? new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.toggleAttribute('data-paused', !entry.isIntersecting)
  })
  : null

for (const effect of effects) {
  const card = document.createElement('button')
  card.type = 'button'
  card.className = 'card'
  card.dataset.effect = effect.id
  card.innerHTML = `<div class="thumbnail" aria-hidden="true">${renderEffect(effect).markup}</div>
    <span class="card-meta"><small>${effect.category}</small><strong>${effect.name}</strong></span>`
  cards.append(card)
  const thumbnail = card.querySelector('.thumbnail > div')
  if (observer) {
    thumbnail.setAttribute('data-paused', '')
    observer.observe(thumbnail)
  }
  card.addEventListener('click', () => select(effect, true))
}

controls.addEventListener('submit', (event) => event.preventDefault())
playback.addEventListener('click', () => {
  paused = !paused
  syncPlayback()
})
byId('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(exportHtml(selected, values))
    status.textContent = 'Copied to clipboard.'
  } catch {
    byId('source').closest('details').open = true
    status.textContent = 'Clipboard unavailable. Select the code above to copy it, or download the HTML.'
  }
})
byId('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([exportHtml(selected, values)], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${selected.id}-animation.html`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})

select(effects[0])
