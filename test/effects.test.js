import assert from 'node:assert/strict'
import test from 'node:test'
import { defaults, effects, exportHtml, renderEffect } from '../src/effects.js'

test('the full catalog exports its actual preview and unique animation', () => {
  assert.equal(effects.length, 125)
  assert.equal(new Set(effects.map(({ id }) => id)).size, effects.length)
  assert.equal(new Set(effects.map(({ css }) => css.match(/@keyframes [^{]+\{([\s\S]*)/)[1])).size, effects.length)
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
        : control.type === 'select' ? control.options.find((value) => value !== control.value)
        : (control.type === 'text' ? 'A new title' : '#123456')
      const settings = ['background2', 'gradientAngle'].includes(key) ? { background: 'gradient' } : {}
      assert.notEqual(exportHtml(effect, { ...settings, [key]: input }), exportHtml(effect, settings), `${effect.id}.${key}`)
    }
  }
})

test('transparent and gradient export backgrounds match settings', () => {
  for (const effect of effects) {
    assert.match(exportHtml(effect, { background: 'transparent' }), /--fill:transparent/)
    assert.match(exportHtml(effect, { background: 'gradient', background1: '#123456', background2: '#abcdef', gradientAngle: 80 }), /--fill:linear-gradient\(80deg,#123456,#abcdef\)/)
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
