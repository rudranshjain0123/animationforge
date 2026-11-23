import './style.css'
import { archivedEffects, defaults, effectById, effects, exportCss, exportEmbed, exportHtml, renderEffect } from './effects.js'

const byId = (id) => document.getElementById(id)
const controls = byId('controls')
const preview = byId('preview')
const grid = byId('cards')
const codePanel = byId('code-panel')
const title = byId('title')
const media = matchMedia('(prefers-reduced-motion: reduce)')
const installed = new Set()
const sheet = document.head.appendChild(document.createElement('style'))
const state = { effect: effects[0], values: defaults(effects[0]), paused: false, project: null, favorites: new Set(), limit: 24, dirty: false }
const report = (message) => { byId('status').textContent = message }

async function api(path, method = 'GET', data) {
  const response = await fetch(path, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  })
  if (response.status === 401) {
    state.dirty = false
    location.reload()
    throw new Error('Your session has expired.')
  }
  if (!response.ok) {
    const details = await response.json().catch(() => ({}))
    throw new Error(details.error || `Request failed (${response.status}).`)
  }
  return response.status === 204 ? undefined : response.json()
}

function guarded(action) {
  return async (event) => {
    const button = event.currentTarget
    button.disabled = true
    report('')
    try { await action(event) } catch (error) { report(error.message) }
    finally { button.disabled = false }
  }
}

function mount(node, effect, values) {
  const { css, markup } = renderEffect(effect, values, { demo: true })
  if (!installed.has(effect.id)) {
    sheet.append(css + '\n')
    installed.add(effect.id)
  }
  node.innerHTML = markup
}

function snapshot() {
  return exportHtml(state.effect, state.values)
}

function updateCode() {
  if (codePanel.hidden) return
  byId('source').textContent = sourceFor(byId('source-kind').value)
  const frame = byId('code-preview')
  const html = snapshot()
  if (frame.srcdoc !== html) frame.srcdoc = html
}

function sourceFor(kind) {
  if (kind === 'css') return exportCss(state.effect, state.values)
  if (kind === 'js') return renderEffect(state.effect, state.values).js
  return kind === 'html' ? snapshot() : exportEmbed(state.effect, state.values)
}

function updatePlayback() {
  preview.firstElementChild?.toggleAttribute('data-paused', state.paused)
  byId('playback').textContent = state.paused ? 'Play' : 'Pause'
  byId('playback').disabled = media.matches
  byId('replay').disabled = media.matches
  byId('motion-note').textContent = media.matches ? 'Reduced motion is enabled in your device settings.' : ''
}

let pendingFrame
let codeTimer
function refreshPreview() {
  cancelAnimationFrame(pendingFrame)
  pendingFrame = requestAnimationFrame(() => {
    mount(preview, state.effect, state.values)
    updatePlayback()
    clearTimeout(codeTimer)
    codeTimer = setTimeout(updateCode, 180)
  })
}

function buildControls() {
  controls.replaceChildren()
  const groups = new Map([
    ['Content & type', /^(text|detail|destination|font|weight|align|tracking)/],
    ['Color & surface', /^(background|gradient|accent|foreground|secondary|color$)/],
    ['Motion', /^(duration|speed|delay|loop|easing|direction)/],
    ['Geometry', /.*/],
  ])
  const sections = new Map()
  for (const [key, field] of Object.entries(state.effect.controls)) {
    const [group] = [...groups].find(([, pattern]) => pattern.test(key))
    if (!sections.has(group)) {
      const section = document.createElement('fieldset')
      const legend = document.createElement('legend')
      legend.textContent = group
      section.append(legend)
      sections.set(group, section)
    }
    const label = document.createElement('label')
    label.className = 'field'
    label.dataset.property = key
    const caption = document.createElement('span')
    caption.textContent = field.label
    const input = document.createElement(field.type === 'select' ? 'select' : 'input')
    input.setAttribute('aria-label', field.label)
    if (field.type === 'select') {
      for (const value of field.options) input.add(new Option(value, value))
    } else {
      input.type = field.type
      if (field.type === 'range') Object.assign(input, { min: field.min, max: field.max, step: field.step })
      if (field.type === 'text') input.maxLength = state.effect.archived ? 40 : 120
    }
    input.value = state.values[key]
    const output = document.createElement('span')
    output.setAttribute('aria-hidden', 'true')
    if (field.type === 'range') output.textContent = input.value
    input.addEventListener('input', () => {
      state.values[key] = field.type === 'range' ? input.valueAsNumber : input.value
      if (field.type === 'range') output.textContent = input.value
      if (key === 'background') showBackgroundFields()
      state.dirty = true
      refreshPreview()
    })
    label.append(caption, output, input)
    sections.get(group).append(label)
  }
  for (const group of groups.keys()) if (sections.has(group)) controls.append(sections.get(group))
  showBackgroundFields()
}

function showBackgroundFields() {
  byId('transparent').setAttribute('aria-pressed', String(state.values.background === 'transparent'))
  controls.querySelector('[data-property="background1"]').hidden = state.values.background === 'transparent'
  for (const key of ['background2', 'gradientAngle']) {
    controls.querySelector(`[data-property="${key}"]`).hidden = state.values.background !== 'gradient'
  }
}

function showFavorite() {
  const favorite = state.favorites.has(state.effect.id)
  byId('favorite').setAttribute('aria-pressed', String(favorite))
  byId('favorite').textContent = favorite ? '★ Favorited' : '☆ Favorite'
}

function selectEffect(effect, values = defaults(effect)) {
  state.effect = effect
  state.values = values
  byId('effect-title').textContent = effect.name
  byId('effect-category').textContent = effect.category
  byId('effect-description').textContent = effect.description
  byId('effect-example').textContent = effect.example
  const hasScript = Boolean(effect.behavior)
  byId('copy-js').disabled = !hasScript
  byId('source-kind').querySelector('[value="js"]').disabled = !hasScript
  if (!hasScript && byId('source-kind').value === 'js') byId('source-kind').value = 'embed'
  byId('export-note').textContent = hasScript ? 'Embed includes a small viewport observer.' : 'This preset uses HTML and CSS. JavaScript is unnecessary.'
  showFavorite()
  for (const card of grid.querySelectorAll('button')) card.setAttribute('aria-pressed', String(card.dataset.id === effect.id))
  buildControls()
  refreshPreview()
}

function makeThumbnailVisible(node, visible) {
  if (visible && node.isConnected && !node.firstElementChild) mount(node, effectById.get(node.parentElement.dataset.id))
  node.firstElementChild?.toggleAttribute('data-paused', !visible)
}

const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
  for (const entry of entries) makeThumbnailVisible(entry.target, entry.isIntersecting)
}) : null

function showLibrary(reset = true) {
  if (reset) state.limit = 24
  const query = byId('search').value.toLowerCase().trim()
  const category = byId('category').value
  const catalog = byId('include-archive').checked ? [...effects, ...archivedEffects] :
    byId('only-favorites').checked ? [...effects, ...archivedEffects.filter((effect) => state.favorites.has(effect.id))] : effects
  const filtered = catalog.filter((effect) => (!category || effect.category === category)
    && (!byId('only-favorites').checked || state.favorites.has(effect.id))
    && `${effect.name} ${effect.category} ${effect.example}`.toLowerCase().includes(query))
  byId('count').textContent = `${filtered.length} of ${catalog.length}`
  byId('more').hidden = filtered.length <= state.limit
  observer?.disconnect()
  grid.replaceChildren()
  for (const effect of filtered.slice(0, state.limit)) {
    const card = document.createElement('article')
    const opener = document.createElement('button')
    card.className = 'card'
    opener.type = 'button'
    card.dataset.id = opener.dataset.id = effect.id
    opener.setAttribute('aria-pressed', String(effect.id === state.effect.id))
    const thumb = document.createElement('div')
    thumb.className = 'thumb'
    thumb.setAttribute('aria-hidden', 'true')
    thumb.inert = true
    thumb.style.setProperty('--thumbnail', effect.backdrop)
    const label = document.createElement('strong')
    label.textContent = effect.name
    const type = document.createElement('small')
    type.textContent = effect.archived ? 'Classic' : effect.category
    opener.append(type, label)
    card.append(thumb, opener)
    opener.addEventListener('click', () => {
      state.dirty = true
      selectEffect(effect)
    })
    grid.append(card)
    if (observer) observer.observe(thumb)
    else makeThumbnailVisible(thumb, true)
  }
  if (!filtered.length) grid.textContent = 'No matching animations.'
}

function fillCategories() {
  const list = byId('category')
  const prior = list.value
  const catalog = byId('include-archive').checked || byId('only-favorites').checked ? [...effects, ...archivedEffects] : effects
  list.replaceChildren(new Option('All categories', ''))
  for (const category of new Set(catalog.map((effect) => effect.category))) list.add(new Option(category, category))
  list.value = [...list.options].some((option) => option.value === prior) ? prior : ''
}

function download() {
  const url = URL.createObjectURL(new Blob([snapshot()], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${state.effect.id}.html`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function openCode() {
  codePanel.hidden = false
  byId('code-toggle').setAttribute('aria-expanded', 'true')
  updateCode()
}

async function save() {
  const input = { title: title.value.trim(), effectId: state.effect.id, values: { ...state.values } }
  if (!input.title) { title.reportValidity(); return }
  const stored = state.project
    ? await api(`/api/projects/${state.project}`, 'PUT', input)
    : await api('/api/projects', 'POST', input)
  state.project = stored.id
  history.replaceState(null, '', `/?project=${stored.id}`)
  state.dirty = input.title !== title.value.trim() || input.effectId !== state.effect.id || JSON.stringify(input.values) !== JSON.stringify(state.values)
  report(state.dirty ? 'Snapshot saved. More changes are pending.' : 'Project saved.')
}

function setupStudio() {
  fillCategories()
  byId('search').addEventListener('input', () => showLibrary())
  for (const id of ['category', 'only-favorites', 'include-archive']) byId(id).addEventListener('change', () => {
    fillCategories()
    showLibrary()
  })
  byId('more').addEventListener('click', () => { state.limit += 24; showLibrary(false) })
  byId('favorite').addEventListener('click', guarded(async () => {
    const id = state.effect.id
    const active = !state.favorites.has(id)
    await api(`/api/favorites/${id}`, 'PUT', { active })
    if (active) state.favorites.add(id)
    else state.favorites.delete(id)
    showFavorite()
    if (byId('only-favorites').checked) showLibrary()
  }))
  controls.addEventListener('submit', (event) => event.preventDefault())
  title.addEventListener('input', () => { state.dirty = true })
  byId('save').addEventListener('click', guarded(save))
  byId('new').addEventListener('click', () => location.assign('/'))
  byId('reset').addEventListener('click', () => { selectEffect(state.effect); state.dirty = true })
  media.addEventListener('change', updatePlayback)
  byId('playback').addEventListener('click', () => { state.paused = !state.paused; updatePlayback() })
  byId('replay').addEventListener('click', () => { state.paused = false; refreshPreview() })
  byId('surface').addEventListener('change', (event) => { preview.dataset.surface = event.target.value })
  byId('transparent').addEventListener('click', () => {
    state.values.background = state.values.background === 'transparent' ? 'solid' : 'transparent'
    state.dirty = true
    buildControls()
    refreshPreview()
  })
  byId('code-toggle').addEventListener('click', () => {
    if (codePanel.hidden) openCode()
    else {
      codePanel.hidden = true
      byId('code-preview').removeAttribute('srcdoc')
      byId('code-toggle').setAttribute('aria-expanded', 'false')
    }
  })
  byId('source-kind').addEventListener('change', updateCode)
  for (const [id, kind, label] of [['copy', 'embed', 'Embed code'], ['copy-css', 'css', 'CSS'], ['copy-js', 'js', 'JavaScript']]) {
    byId(id).addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(sourceFor(kind))
        report(`${label} copied.`)
      } catch {
        byId('source-kind').value = kind
        openCode()
        byId('source').parentElement.focus()
        report('Clipboard unavailable. Select the displayed source or download HTML.')
      }
    })
  }
  byId('download').addEventListener('click', download)
  window.addEventListener('beforeunload', (event) => { if (state.dirty) event.preventDefault() })
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) api('/auth/session').then(({ user }) => { if (!user) location.reload() })
      .catch((error) => report(error.message))
  })
}

async function showProjects() {
  const projects = await api('/api/projects')
  const list = byId('project-list')
  list.replaceChildren()
  if (!projects.length) list.textContent = 'Your saved animations will appear here.'
  for (const project of projects) {
    const row = document.createElement('article')
    row.className = 'project-row'
    const info = document.createElement('div')
    const name = document.createElement('h2')
    name.textContent = project.title
    const details = document.createElement('p')
    details.textContent = `${effectById.get(project.effectId)?.name ?? 'Animation'} · ${new Date(project.updated).toLocaleString()}`
    info.append(name, details)
    const actions = document.createElement('div')
    actions.className = 'actions'
    const edit = document.createElement('a')
    edit.className = 'primary'
    edit.href = `/?project=${project.id}`
    edit.textContent = 'Edit'
    actions.append(edit)
    for (const [label, action] of [
      ['Duplicate', () => api(`/api/projects/${project.id}/duplicate`, 'POST')],
      ['Delete', () => confirm(`Delete “${project.title}”?`) && api(`/api/projects/${project.id}`, 'DELETE')],
    ]) {
      const button = document.createElement('button')
      button.textContent = label
      button.addEventListener('click', guarded(async () => { await action(); await showProjects() }))
      actions.append(button)
    }
    row.append(info, actions)
    list.append(row)
  }
}

async function start() {
  const { user } = await api('/auth/session')
  if (!user) { location.reload(); return }
  byId('auth-name').textContent = user.name
  setTimeout(() => { state.dirty = false; location.reload() }, Math.max(0, user.expires - Date.now()))
  const dashboard = location.pathname === '/projects'
  byId(dashboard ? 'projects-link' : 'studio-link').setAttribute('aria-current', 'page')
  byId(dashboard ? 'projects' : 'studio').hidden = false
  if (dashboard) { await showProjects(); return }
  const id = new URLSearchParams(location.search).get('project')
  const [favorites, projects] = await Promise.all([api('/api/favorites'), id ? api('/api/projects') : []])
  const saved = projects.find((item) => item.id === id)
  state.favorites = new Set(favorites)
  if (saved && effectById.has(saved.effectId)) {
    state.project = saved.id
    title.value = saved.title
    selectEffect(effectById.get(saved.effectId), { ...defaults(effectById.get(saved.effectId)), ...saved.values })
  } else {
    selectEffect(state.effect)
    if (id) report('That project was not found.')
  }
  setupStudio()
  showLibrary()
}

start().catch((error) => report(error.message))
