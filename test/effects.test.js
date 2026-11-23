import assert from 'node:assert/strict'
import test from 'node:test'
import { defaults, effects, exportHtml, renderEffect } from '../src/effects.js'

test('five unique effects export their actual preview and animation', () => {
  assert.equal(effects.length, 5)
  assert.equal(new Set(effects.map(({ id }) => id)).size, 5)
  assert.equal(new Set(effects.map(({ css }) => css)).size, 5)
  for (const effect of effects) {
    const html = exportHtml(effect, defaults(effect))
    const preview = renderEffect(effect)
    assert.ok(html.startsWith('<!doctype html>'))
    assert.ok(html.includes(preview.markup))
    assert.ok(html.includes(preview.css))
    assert.match(html, /@keyframes/)
    assert.match(html, /prefers-reduced-motion/)
    assert.doesNotMatch(html, /<(script|link)\b/)
  }
})

test('each available control updates its standalone export', () => {
  for (const effect of effects) {
    for (const [key, control] of Object.entries(effect.controls)) {
      const input = control.type === 'range'
        ? (control.value === control.max ? control.min : control.max)
        : (control.type === 'text' ? 'A new title' : '#123456')
      assert.notEqual(exportHtml(effect, { [key]: input }), exportHtml(effect), `${effect.id}.${key}`)
    }
  }
})

test('text is escaped, numeric inputs are bounded, and loaders use shape controls', () => {
  const html = exportHtml(effects[0], { text: '<script>f()</script>', color: 'red;display:none' })
  assert.doesNotMatch(html, /<script>|red;display:none/)
  assert.match(html, /&lt;script&gt;/)
  const dots = effects.find(({ id }) => id === 'dots')
  assert.equal('text' in dots.controls, false)
  assert.equal(renderEffect(dots, { count: 99 }).markup.match(/<i /g).length, 8)
})
