import assert from 'node:assert/strict'
import test from 'node:test'
import { archivedEffects, defaults, effectById, effects, exportCss, exportEmbed, exportHtml, renderEffect } from '../src/effects.js'

test('curated effects export the actual component and preserve all original IDs', () => {
  assert.equal(archivedEffects.length, 125)
  assert.equal(effectById.size, archivedEffects.length + effects.length)
  assert.ok(effects.length >= 20)
  assert.equal(new Set(effects.map(({ css }) => css.match(/@keyframes [^{]+\{([\s\S]*)/)[1])).size, effects.length)
  for (const effect of effects) {
    const html = exportHtml(effect, defaults(effect))
    const preview = renderEffect(effect)
    assert.ok(html.startsWith('<!doctype html>'))
    assert.ok(html.includes(preview.markup))
    assert.ok(html.includes(preview.css))
    assert.match(html, /@keyframes/)
    assert.match(html, /prefers-reduced-motion/)
    assert.doesNotMatch(html, /<(script|link)[^>]+(?:src|href)=/)
    assert.equal(html.includes('<script>'), Boolean(preview.js))
    assert.doesNotMatch(exportEmbed(effect), /(?:^|\n)html,body\{/)
    assert.ok(effect.example && effect.description)
  }
})

test('each available control updates its standalone export', () => {
  for (const effect of effects) {
    for (const [key, control] of Object.entries(effect.controls)) {
      const input = control.type === 'range'
        ? (control.value === control.max ? control.min : control.max)
        : control.type === 'select' ? control.options.find((value) => value !== control.value)
        : (control.type === 'text' ? (key === 'destination' ? '/example' : 'A new title') : '#123456')
      const settings = ['background2', 'gradientAngle'].includes(key) ? { background: 'gradient' }
        : key === 'background1' ? { background: 'solid' } : {}
      assert.notEqual(exportHtml(effect, { ...settings, [key]: input }), exportHtml(effect, settings), `${effect.id}.${key}`)
    }
  }
})

test('transparent and gradient export backgrounds match settings', () => {
  for (const effect of effects) {
    assert.match(exportHtml(effect, { background: 'transparent' }), /--af-fill:transparent/)
    assert.match(exportCss(effect, { background: 'gradient', background1: '#123456', background2: '#abcdef', gradientAngle: 80 }), /--af-fill:linear-gradient\(80deg,#123456,#abcdef\)/)
  }
})

test('text is escaped, numeric inputs are bounded, and loaders use shape controls', () => {
  const html = exportHtml(effects[0], { text: '<script>f()</script>', textColor: 'red;display:none' })
  assert.doesNotMatch(html, /<script>|red;display:none/)
  assert.match(html, /&lt;script&gt;/)
  const dots = effectById.get('dots')
  assert.equal('text' in dots.controls, false)
  assert.equal(renderEffect(dots, { count: 99 }).markup.match(/<i /g).length, 8)
})

test('existing project settings can still be rendered, and CSS-only exports omit scripts', () => {
  for (const effect of archivedEffects) {
    const markup = renderEffect(effect).markup
    assert.match(markup, new RegExp('class="af-' + effect.id + '"'))
    assert.doesNotMatch(exportEmbed(effect), /<script>/)
  }
  const callToAction = effectById.get('arrow-cta')
  const css = exportCss(callToAction, { foreground: '#123456', textColor: '#abcdef', duration: 2, speed: 2, loop: 'twice' })
  assert.match(css, /--af-foreground:#123456;.*--af-textColor:#abcdef/)
  assert.match(css, /--af-loop:2;.*--af-duration:1s/)
  assert.doesNotMatch(renderEffect(callToAction).markup, /data-af-demo/)
})
