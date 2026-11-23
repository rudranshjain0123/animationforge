import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { archivedEffects, effects, renderEffect } from '../src/effects.js'

const output = process.argv[2] || '/tmp/animationforge-contact'
const catalog = process.argv.includes('--classic') ? archivedEffects : effects
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' })
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } })
  for (let start = 0; start < catalog.length; start += 25) {
    const items = catalog.slice(start, start + 25)
    const styles = items.map((effect) => renderEffect(effect).css).join('')
    const cells = items.map((effect, i) => {
      const { markup } = renderEffect(effect, { background: 'transparent' }, { demo: true })
      const filled = ['arrow-cta', 'button-sweep', 'feature-card', 'card-stack', 'route-iris', 'payment-success'].includes(effect.id)
      const dark = renderEffect(effect, { background: 'transparent', ...(filled ? {} : { textColor: '#fff1dd' }) }, { demo: true }).markup
      return `<article><strong>${start + i + 1}. ${effect.name}</strong><div>${markup}</div><div>${dark}</div></article>`
    }).join('')
    await page.setContent(`<style>${styles}
      body{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;background:#dbd6ca;font:14px system-ui}
      article{min-width:0;background:white;overflow:hidden;padding:6px}
      article>div{display:inline-block;width:50%;height:118px;overflow:hidden}
      article>div:last-child{background:#27323a}
      article>div>div{min-height:118px!important}
      strong{display:block}
      </style>${cells}`)
    await page.evaluate(async () => {
      for (const article of document.querySelectorAll('article')) {
        for (const [index, cell] of [...article.querySelectorAll(':scope > div')].entries()) {
          for (const animation of cell.getAnimations({ subtree: true })) {
            animation.pause()
            await animation.ready
            animation.currentTime = animation.effect.getTiming().duration * (index ? .64 : .28)
          }
        }
      }
    })
    await page.screenshot({ path: `${output}/page-${start / 25 + 1}.png`, fullPage: true })
  }
} finally {
  await browser.close()
}
