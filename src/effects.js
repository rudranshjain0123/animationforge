import { groups } from './catalog.js'
import { studioPresets } from './studio-presets.js'
import { revealScript } from './reveal-script.js'

const text = (value) => ({ type: 'text', label: 'Text', value })
const range = (label, value, min, max, step = 1) => ({ type: 'range', label, value, min, max, step })
const color = (value) => ({ type: 'color', label: 'Color', value })
const speed = (value) => range('Duration (seconds)', value, 0.5, 5, 0.1)

const originals = [
  {
    id: 'spring', name: 'Springy Type', category: 'Kinetic text', backdrop: '#dce7ff',
    controls: { text: text('MAKE IT MOVE'), color: color('#1847c7'), duration: speed(1.5), height: range('Bounce height', 17, 4, 36) },
    render: (v) => `<span aria-label="${escapeHtml(v.text)}">${Array.from(v.text, (letter, index) =>
      `<b aria-hidden="true" style="--i:${index % 14}">${escapeHtml(letter === ' ' ? ' ' : letter)}</b>`).join('')}</span>`,
    css: '.af-spring b{display:inline-block;animation:af-bounce var(--duration) ease-in-out infinite;animation-delay:calc(var(--i) * 45ms)} @keyframes af-bounce{35%{transform:translateY(calc(-1px * var(--height))) rotate(-5deg)}55%{transform:translateY(3px) rotate(2deg)}}',
  },
  {
    id: 'dots', name: 'Dot Parade', category: 'Loader', backdrop: '#d6f5e8',
    controls: { color: color('#006248'), duration: speed(1.2), count: range('Dot count', 3, 2, 8), size: range('Dot size', 14, 6, 26) },
    render: (v) => `<span class="dots" role="img" aria-label="Loading">${Array.from({ length: v.count }, (_, index) => `<i style="--i:${index}"></i>`).join('')}</span>`,
    css: '.af-dots .dots{display:flex;gap:7px}.af-dots i{width:calc(var(--size) * 1px);aspect-ratio:1;border-radius:50%;background:currentColor;animation:af-dot var(--duration) ease-in-out infinite;animation-delay:calc(var(--i) * 100ms)} @keyframes af-dot{35%{transform:translateY(-14px);opacity:.55}}',
  },
  {
    id: 'wipe', name: 'Color Wipe', category: 'Transition', backdrop: '#ffdfd7',
    controls: { text: text('NEXT UP'), color: color('#9b2820'), duration: speed(2), angle: range('Skew angle', 10, 0, 30) },
    render: (v) => `<span>${escapeHtml(v.text)}</span>`,
    css: '.af-wipe span{position:relative;isolation:isolate;overflow:hidden;padding:.3em .5em;border:2px solid currentColor}.af-wipe span::after{position:absolute;content:"";inset:0 -25%;background:currentColor;transform:translateX(-100%);animation:af-wipe-pass var(--duration) ease-in-out infinite} @keyframes af-wipe-pass{50%{transform:translateX(0) skewX(calc(var(--angle) * 1deg))}100%{transform:translateX(100%) skewX(calc(var(--angle) * 1deg))}}',
  },
  {
    id: 'orbit', name: 'Orbit Pop', category: 'Shape', backdrop: '#ffe89d',
    controls: { color: color('#734315'), duration: speed(2.7), size: range('Orbit size', 78, 42, 110), count: range('Satellites', 2, 1, 5) },
    render: (v) => `<span role="img" aria-label="Orbiting dots" class="orbit"><b>${Array.from({ length: v.count }, (_, index) =>
      `<i style="--angle:${index * 360 / v.count}deg"></i>`).join('')}</b></span>`,
    css: '.af-orbit .orbit{position:relative;width:calc(var(--size) * 1px);aspect-ratio:1;border:2px solid currentColor;border-radius:50%}.af-orbit b{position:absolute;inset:0;animation:af-orbit-turn var(--duration) linear infinite}.af-orbit i{position:absolute;inset:0;transform:rotate(var(--angle))}.af-orbit i::before{content:"";position:absolute;top:-7px;left:calc(50% - 5px);width:10px;height:10px;border-radius:50%;background:currentColor}@keyframes af-orbit-turn{to{transform:rotate(1turn)}}',
  },
  {
    id: 'ticker', name: 'Looping Ticker', category: 'Kinetic text', backdrop: '#e9e3ff',
    controls: { text: text('CREATE · SHARE · REPEAT'), color: color('#332154'), duration: speed(3.8) },
    render: (v) => `<span class="marquee" aria-label="${escapeHtml(v.text)}"><b aria-hidden="true"><i>${escapeHtml(v.text)}</i><i>${escapeHtml(v.text)}</i></b></span>`,
    css: '.af-ticker .marquee{display:block;width:100%;overflow:hidden;white-space:nowrap}.af-ticker b{display:flex;width:max-content;animation:af-ticker-scroll var(--duration) linear infinite}.af-ticker i{display:block;font-style:normal;padding-inline:.65em}@keyframes af-ticker-scroll{to{transform:translateX(-50%)}}',
  },
]

const backdrops = ['#dce7ff', '#d6f5e8', '#ffdfd7', '#ffe89d', '#eadce7']
const originalCategories = ['Text', 'Loaders', 'Transitions', 'Shapes', 'Text']
const select = (label, value, options) => ({ type: 'select', label, value, options })

function particles({ count, size }) {
  return Array.from({ length: count }, (_, i) => {
    // Fixed positions make exports deterministic and previews reproducible.
    const angle = i * 2.399963
    const radius = 25 + i / count * 58
    const x = Math.round(Math.cos(angle) * radius)
    const y = Math.round(Math.sin(angle) * radius)
    return `<i style="--i:${i};--x:${x};--y:${y};--col:${i % 8 - 3.5};--row:${Math.floor(i / 8) - 1};--dot:${size}px"></i>`
  }).join('')
}

function recipe(category, [name, frames, timing = '', art = ''], index) {
  const id = name.toLowerCase().replaceAll(' ', '-')
  const scope = `.af-${id}`
  const animation = `af-motion-${id}`
  const textRecipe = ['Text', 'Transitions', '3D'].includes(category)
  const particleRecipe = category === 'Particles'
  const layer = category === 'Backgrounds'
  const panel = ['Transitions', '3D', 'Effects'].includes(category)
  const accent = /var\(--accent\)/.test(art + frames) || particleRecipe
  const controls = { color: color('#284aaa'), duration: speed(2.4) }
  if (textRecipe) controls.text = text(category === 'Text' ? 'MAKE IT MOVE' : 'STUDIO')
  if (accent) controls.accent = { ...color('#ed7256'), label: 'Accent color' }
  if (particleRecipe) {
    controls.count = range('Particles', 23, 5, 32)
    if (!art.includes('width:')) controls.size = range('Particle size', 8, 3, 15)
  }
  const element = particleRecipe ? '.art i' : '.art'
  const base = textRecipe && !panel ? 'font:inherit' :
    particleRecipe ? 'position:absolute;width:var(--dot);height:var(--dot);background:currentColor;animation-delay:calc(var(--i) * -93ms)' :
    layer ? 'width:100%;height:100%' :
    panel ? `display:grid;place-items:center;width:min(180px,100%);height:74px;border-radius:10px;background:currentColor` :
    'width:80px;height:80px;background:currentColor'
  return {
    id, name, category, backdrop: backdrops[index % backdrops.length], controls,
    timing: timing || 'ease-in-out',
    render: (v) => particleRecipe ? `<span class="art" aria-hidden="true">${particles({ ...v, size: v.size ?? 8 })}</span>` :
      `<span class="art"${textRecipe ? '' : ' aria-hidden="true"'}>${textRecipe ? panel ? `<span>${escapeHtml(v.text)}</span>` : escapeHtml(v.text) : ''}</span>`,
    css: `${scope} .stage{perspective:340px}
${scope} ${element}{${base};animation-name:${animation};animation-duration:var(--duration);animation-timing-function:var(--easing);animation-iteration-count:infinite;${art}}
${particleRecipe ? `${scope} .art{position:relative}${scope} i:nth-child(3n){color:var(--accent)}` : ''}
${panel && textRecipe ? `${scope} .art>span{color:#fff;text-shadow:0 1px 4px #000}` : ''}
${id === 'radar-sweep' ? '@property --sweep{syntax:"<angle>";initial-value:0deg;inherits:false}' : ''}
@keyframes ${animation}{${frames}}`.replaceAll('--sweep', '--af-classic-radar-sweep'),
  }
}

export const archivedEffects = [
  ...originals.map((effect, index) => ({
    ...effect,
    category: originalCategories[index],
    timing: ['ease-in-out', 'ease-in-out', 'ease-in-out', 'linear', 'linear'][index],
    css: effect.css.replace(/var\(--duration\) (ease-in-out|linear)/g, 'var(--duration) var(--easing)'),
  })),
  ...Object.entries(groups).flatMap(([category, recipes]) => recipes.map((entry, index) => recipe(category, entry, index))),
].map((effect) => ({
  ...effect,
  archived: true,
  description: 'An archived effect. Existing projects can still be edited and exported.',
  example: 'Classic AnimationForge preset',
  controls: {
    ...effect.controls,
    speed: range('Playback speed', 1, .25, 3, .05),
    easing: select('Easing', effect.timing, [...new Set([effect.timing, 'ease-in-out', 'ease-in', 'ease-out', 'linear', 'steps(8,end)'])]),
    scale: range('Scale', 100, 40, 160),
    x: range('Horizontal position', 0, -100, 100),
    y: range('Vertical position', 0, -85, 85),
    background: select('Background', 'solid', ['solid', 'gradient', 'transparent']),
    background1: { ...color(effect.backdrop), label: 'Background color' },
    background2: { ...color('#fef9eb'), label: 'Gradient end color' },
    gradientAngle: range('Gradient angle', 135, 0, 360),
  },
}))

const fonts = {
  'Modern Sans': 'system-ui,sans-serif',
  'Editorial Serif': 'Georgia,serif',
  'Monospace': 'ui-monospace,monospace',
  'Humanist': 'Verdana,sans-serif',
}
const easings = {
  'Studio ease': 'cubic-bezier(.22,1,.36,1)',
  Linear: 'linear',
  'Ease in': 'ease-in',
  'Ease out': 'ease-out',
  'Ease in out': 'ease-in-out',
  'Steps': 'steps(8,end)',
}

function preparePreset(preset) {
  const scope = `.af-studio-${preset.id}`
  const motion = 'animation:af-studio-' + preset.id
    + ' var(--af-duration) var(--af-easing) var(--af-delay) var(--af-loop) var(--af-direction) both'
  const typography = preset.controls.text ? {
    textColor: { ...color(preset.textColor ?? '#292433'), label: 'Text color' },
    font: select('Font family', 'Modern Sans', Object.keys(fonts)),
    fontSize: range('Font size (px)', preset.fontSize ?? 24, 12, 86),
    weight: range('Font weight', 650, 300, 900, 50),
    align: select('Alignment', 'center', ['start', 'center', 'end']),
    tracking: range('Letter spacing (px)', 0, -4, 12, .25),
  } : {}
  const controls = {
    ...preset.controls, ...typography,
    duration: range('Duration (seconds)', preset.duration ?? .8, .15, 18, .05),
    speed: range('Playback speed', 1, .25, 3, .05),
    delay: range('Delay (seconds)', 0, 0, 6, .05),
    easing: select('Easing', preset.loop ? 'Ease in out' : 'Studio ease', Object.keys(easings)),
    loop: select('Repeat', preset.loop ? 'continuous' : 'once', ['once', 'twice', 'continuous']),
    direction: select('Direction', 'normal', ['normal', 'reverse', 'alternate', 'alternate-reverse']),
    x: range('Horizontal offset', 0, -100, 100),
    y: range('Vertical offset', 0, -85, 85),
    background: select('Background', 'transparent', ['transparent', 'solid', 'gradient']),
    background1: { ...color('#f5e9da'), label: 'Background color' },
    background2: { ...color('#e3d6ef'), label: 'Gradient end color' },
    gradientAngle: range('Gradient angle', 135, 0, 360),
  }
  if (preset.category === 'Backgrounds') controls.height = range('Height (px)', 160, 80, 480)
  return {
    ...preset, scope, controls, backdrop: '#f4ece2',
    css: `${scope}{display:grid;box-sizing:border-box;isolation:isolate;position:relative;overflow:hidden;width:100%;min-width:0;min-height:var(--af-height,0px);background:var(--af-fill);container-type:inline-size}
${scope} .af-stage{box-sizing:border-box;display:grid;align-items:center;justify-items:var(--af-align,center);min-width:0;min-height:inherit;translate:var(--af-x) var(--af-y);color:var(--af-textColor,inherit);text-align:var(--af-align,center);font-family:var(--af-font,inherit);font-weight:var(--af-weight,inherit);font-size:clamp(12px,10cqi,var(--af-fontSize,24px));letter-spacing:var(--af-tracking,normal);line-height:1.12;overflow-wrap:anywhere}
${scope} :where(.af-copy,.af-action,.af-feature,.af-nav,.af-details){box-sizing:border-box;max-width:100%;letter-spacing:inherit}
${scope} :where(.af-action,.af-feature,.af-nav){text-decoration:none}
${scope} :where(a,button,summary):focus-visible{outline:2px solid currentColor;outline-offset:-2px}
${preset.css.replaceAll('&', scope).replaceAll('@motion', 'af-studio-' + preset.id).replaceAll('@play', motion)}
${scope}[data-paused] *,${scope}[data-paused] *::before,${scope}[data-paused] *::after{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){${scope} *,${scope} *::before,${scope} *::after{animation:none!important}}`,
  }
}

export const effects = studioPresets.map(preparePreset)
export const effectById = new Map([...archivedEffects, ...effects].map((effect) => [effect.id, effect]))
export const defaults = (effect) => Object.fromEntries(Object.entries(effect.controls).map(([key, control]) => [key, control.value]))

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

export function normalizeValues(effect, input = {}) {
  const values = defaults(effect)
  for (const [key, control] of Object.entries(effect.controls)) {
    const value = input[key]
    if (control.type === 'text' && typeof value === 'string') values[key] = value.slice(0, effect.archived ? 40 : 120)
    if (control.type === 'color' && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) values[key] = value
    if (control.type === 'select' && control.options.includes(value)) values[key] = value
    if (control.type === 'range' && typeof value === 'number' && Number.isFinite(value)) {
      const steps = Math.round((value - control.min) / control.step)
      values[key] = Math.min(control.max, Math.max(control.min, +(control.min + steps * control.step).toFixed(2)))
    }
  }
  return values
}

function fillFor({ background, background1, background2, gradientAngle }) {
  return { solid: background1, gradient: `linear-gradient(${gradientAngle}deg,${background1},${background2})`, transparent: 'transparent' }[background]
}

function renderPreset(effect, values, demo) {
  const { text: words, detail, destination, background, background1, background2, gradientAngle, duration, speed, ...properties } = values
  const variables = {
    ...properties,
    ...(properties.font ? { font: fonts[properties.font] } : {}),
    easing: easings[values.easing],
    loop: { once: 1, twice: 2, continuous: 'infinite' }[values.loop],
    duration: `${Math.max(.075, duration / speed)}s`,
    delay: `${values.delay}s`,
    fill: fillFor({ background, background1, background2, gradientAngle }),
  }
  for (const key of ['x', 'y', 'height', 'fontSize', 'tracking']) if (key in variables) variables[key] += 'px'
  const style = Object.entries(variables).map(([key, value]) => `--af-${key}:${value}`).join(';')
  const mode = (demo ? ' data-af-demo' : '') + (effect.behavior === 'reveal' ? ' data-af-reveal' : '')
  const markup = `<div class="${effect.scope.slice(1)}"${mode} style="${style}"><div class="af-stage">${effect.render({ ...values, text: words, detail, destination, demo }, escapeHtml)}</div></div>`
  return { css: effect.css, markup, js: effect.behavior === 'reveal' ? revealScript : '', style }
}

export function renderEffect(effect, input = {}, { demo = false } = {}) {
  const values = normalizeValues(effect, input)
  if (!effect.archived) return renderPreset(effect, values, demo)
  const scope = `.af-${effect.id}`
  const { text: words, background, background1, background2, gradientAngle, duration, speed, ...properties } = values
  const minimumPeriod = { 'neon-flicker': 2, 'negative-flash': 1, 'signal-interference': 1.2 }[effect.id] ?? 0
  const fill = fillFor({ background, background1, background2, gradientAngle })
  const variables = Object.entries(properties).map(([key, value]) => `--${key}:${value}`).join(';')
  const css = `${scope}{box-sizing:border-box;display:grid;place-items:center;min-height:130px;width:100%;overflow:hidden;background:var(--fill);color:var(--color);text-align:center;overflow-wrap:anywhere;container-type:inline-size}
${scope} .stage{width:100%;height:100%;min-height:inherit;display:grid;place-items:center;font:900 clamp(15px,6cqi,34px)/1.1 system-ui,sans-serif;translate:calc(var(--x)*1px) calc(var(--y)*1px);scale:calc(var(--scale)/100)}
${scope} .art{box-sizing:border-box}
${effect.css}
${scope}[data-paused] *,${scope}[data-paused] *::before,${scope}[data-paused] *::after{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){${scope} *,${scope} *::before,${scope} *::after{animation:none!important}}`
  const style = `${variables};--fill:${fill};--duration:${Math.max(minimumPeriod, duration / speed)}s`
  const markup = `<div class="af-${effect.id}" style="${style}"><div class="stage">${effect.render({ ...values, text: words })}</div></div>`
  return { css, markup, js: '', style }
}

export function exportCss(effect, values) {
  const { css, style } = renderEffect(effect, values)
  return `${effect.scope ?? '.af-' + effect.id}{${style}}\n${css}`
}

export function exportEmbed(effect, values, options) {
  const { css, markup, js } = renderEffect(effect, values, options)
  return `<style>\n${css}\n</style>\n${markup}${js ? `\n<script>\n${js}\n</script>` : ''}`
}

export function exportHtml(effect, values, options) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${effect.name}</title>
<style>html,body{margin:0;background:transparent}</style>
</head>
<body>
${exportEmbed(effect, values, options)}
</body>
</html>`
}
