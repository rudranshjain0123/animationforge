const text = (value) => ({ type: 'text', label: 'Text', value })
const range = (label, value, min, max, step = 1) => ({ type: 'range', label, value, min, max, step })
const color = (value) => ({ type: 'color', label: 'Color', value })
const speed = (value) => range('Duration (seconds)', value, 0.5, 5, 0.1)

export const effects = [
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
    css: '.af-wipe span{position:relative;isolation:isolate;overflow:hidden;padding:.3em .5em;background:#fffaf0;border:2px solid currentColor}.af-wipe span::after{position:absolute;content:"";inset:0 -25%;background:currentColor;transform:translateX(-100%);animation:af-wipe-pass var(--duration) ease-in-out infinite} @keyframes af-wipe-pass{50%{transform:translateX(0) skewX(calc(var(--angle) * 1deg))}100%{transform:translateX(100%) skewX(calc(var(--angle) * 1deg))}}',
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

export const defaults = (effect) => Object.fromEntries(Object.entries(effect.controls).map(([key, control]) => [key, control.value]))

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

export function renderEffect(effect, input = {}) {
  const values = defaults(effect)
  for (const [key, control] of Object.entries(effect.controls)) {
    const value = input[key]
    if (control.type === 'text' && typeof value === 'string') values[key] = value.slice(0, 40)
    if (control.type === 'color' && typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) values[key] = value
    if (control.type === 'range' && typeof value === 'number' && Number.isFinite(value)) {
      const steps = Math.round((value - control.min) / control.step)
      values[key] = Math.min(control.max, Math.max(control.min, +(control.min + steps * control.step).toFixed(2)))
    }
  }
  const scope = `.af-${effect.id}`
  const variables = Object.entries(values).filter(([key]) => key !== 'text')
    .map(([key, value]) => `--${key}:${value}${key === 'duration' ? 's' : ''}`).join(';')
  const css = `${scope}{box-sizing:border-box;display:grid;place-items:center;min-height:130px;width:100%;overflow:hidden;padding:12px;background:${effect.backdrop};color:var(--color);font:900 clamp(15px,3.2vw,30px)/1.15 system-ui,sans-serif;text-align:center;overflow-wrap:anywhere}
${effect.css}
${scope}[data-paused] *,${scope}[data-paused] *::after{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){${scope} *,${scope} *::after{animation:none!important}}`
  const markup = `<div class="af-${effect.id}" style="${variables}">${effect.render(values)}</div>`
  return { css, markup }
}

export function exportHtml(effect, values) {
  const { css, markup } = renderEffect(effect, values)
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${effect.name}</title>
<style>
${css}
</style>
${markup}
</html>`
}
