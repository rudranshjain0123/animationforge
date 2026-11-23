import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { createApp } from '../server/app.js'
import { openStorage } from '../server/storage.js'
import { effects, effectById, exportEmbed, exportHtml } from '../src/effects.js'

const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' })
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')

test('all studio exports animate offline over light, dark, color, gradient and clear surfaces', { timeout: 180_000 }, async () => {
  const browser = await launch()
  try {
    const context = await browser.newContext({ offline: true, viewport: { width: 360, height: 160 }, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    for (const effect of effects) {
      for (const surface of ['#fff8ed', '#20253a', '#cce9dc', 'linear-gradient(#e2cdd9,#bde3dc)', 'transparent']) {
        const textColor = surface === '#20253a' ? '#f8e0be' : '#221a34'
        await page.setContent(`<style>body{margin:0;background:${surface}} #host{min-height:155px;display:grid}#host>div{min-height:inherit}#neighbor{color:rgb(1, 2, 3)}</style><main id="host">${exportEmbed(effect, {background:'transparent', textColor}, {demo:true})}</main><span id="neighbor">Host page</span>`)
        const imageHashes = []
        for (const fraction of [.08, .41, .79]) {
          const info = await page.evaluate(async (position) => {
            const box = document.querySelector('#host>div')
            const animations = box.getAnimations({ subtree: true })
            for (const animation of animations) {
              animation.pause()
              await animation.ready
              const { duration, delay } = animation.effect.getTiming()
              animation.currentTime = duration * position + Math.max(0, delay)
            }
            return {
              count: animations.length, background: getComputedStyle(box).backgroundColor,
              neighbor: getComputedStyle(document.getElementById('neighbor')).color,
            }
          }, fraction)
          assert.ok(info.count, `${effect.name} has no browser animation`)
          assert.equal(info.background, 'rgba(0, 0, 0, 0)', effect.name)
          assert.equal(info.neighbor, 'rgb(1, 2, 3)')
          imageHashes.push(hash(await page.screenshot({ omitBackground: true })))
        }
        assert.ok(new Set(imageHashes).size > 1, `${effect.name} has no visible frame changes on ${surface}`)
      }
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0)
  } finally { await browser.close() }
})

test('standalone controls keep text and art colors separate and preserve playback settings', async () => {
  const browser = await launch()
  try {
    const page = await browser.newPage()
    const effect = effectById.get('arrow-cta')
    await page.setContent(exportHtml(effect, {
      text: 'Read the field guide', textColor: '#412131', foreground: '#ffddbd', font: 'Editorial Serif',
      duration: 2, speed: 2, delay: .2, loop: 'twice', direction: 'alternate', tracking: 2,
    }))
    const button = page.getByRole('button', { name: 'Read the field guide' })
    assert.equal(await button.evaluate((node) => getComputedStyle(node).backgroundColor), 'rgb(255, 221, 189)')
    assert.equal(await button.evaluate((node) => getComputedStyle(node).color), 'rgb(65, 33, 49)')
    assert.match(await button.evaluate((node) => getComputedStyle(node).fontFamily), /Georgia/)
    assert.equal(await page.locator('.af-copy').evaluate((node) => getComputedStyle(node).letterSpacing), '2px')
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0)
    await button.focus()
    assert.deepEqual(await page.evaluate(() => {
      const timing = document.getAnimations()[0].effect.getTiming()
      return [timing.duration, timing.delay, timing.iterations, timing.direction]
    }), [1000, 200, 2, 'alternate'])
    await page.setContent(exportHtml(effectById.get('disclosure-deploy')))
    await page.getByText('How does delivery work?').click()
    await page.getByText('Ships within two business days.').waitFor()
    await page.setContent(exportHtml(effectById.get('section-focus')))
    await page.locator('[data-af-entered]').waitFor()
  } finally { await browser.close() }
})

test('protected studio and dashboard work in a real browser', { timeout: 40_000 }, async () => {
  const browser = await launch()
  const storage = openStorage()
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  const provider = {
    start: async () => ({ url: origin + '/auth/callback?code=demo&state=demo', state: 'demo' }),
    finish: async () => ({ sub: 'browser-test', name: 'Studio Tester' }),
  }
  server.on('request', createApp({ origin, provider, storage }))
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' })
    page.setDefaultTimeout(7000)
    await page.goto(origin + '/projects')
    await page.getByRole('link', { name: 'Continue with Hack Club' }).click()
    await page.getByText('Studio Tester').waitFor()
    await page.getByRole('searchbox').fill('Arrow CTA')
    await page.getByRole('button', { name: /Arrow CTA/ }).click()
    await page.getByRole('button', { name: '☆ Favorite' }).click()
    await page.getByRole('button', { name: '★ Favorited' }).waitFor()
    await page.getByLabel('Background', { exact: true }).selectOption('solid')
    await page.getByRole('button', { name: 'Transparent', exact: true }).click()
    await page.getByLabel('Sample website background').selectOption('dark')
    await page.getByLabel('Button label').fill('Read more')
    const color = page.getByLabel('Text color')
    await color.fill('#feffff')
    await page.waitForFunction(() => {
      const copy = document.querySelector('#preview .af-copy')
      return copy?.textContent === 'Read more' && getComputedStyle(copy).color === 'rgb(254, 255, 255)'
    })
    await page.getByRole('button', { name: 'Pause' }).click()
    assert.equal(await page.locator('#preview [data-paused]').count(), 1)
    await page.getByRole('button', { name: 'Preview HTML' }).click()
    assert.match(await page.locator('#source').textContent(), /--af-fill:transparent/)
    assert.match(await page.locator('#source').textContent(), /--af-textColor:#feffff/)
    await page.frameLocator('#code-preview').getByText('Read more').waitFor()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download Standalone HTML' }).click()])
    assert.equal(download.suggestedFilename(), 'arrow-cta.html')
    await page.getByLabel('Project title').fill('Mint loader')
    await page.getByRole('button', { name: 'Save project' }).click()
    await page.getByText('Project saved.').waitFor()
    await page.getByRole('link', { name: 'Projects', exact: true }).click()
    await page.getByRole('button', { name: 'Duplicate' }).click()
    await page.getByText('Mint loader (copy)', { exact: true }).waitFor()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('article').filter({ hasText: 'Mint loader (copy)' }).getByRole('button', { name: 'Delete' }).click()
    await page.getByText('Mint loader (copy)', { exact: true }).waitFor({ state: 'detached' })
    await page.getByRole('link', { name: 'Edit' }).click()
    assert.equal(await page.getByLabel('Background', { exact: true }).inputValue(), 'transparent')
    assert.equal(await page.getByLabel('Button label').inputValue(), 'Read more')
    await page.setViewportSize({ width: 390, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.getByRole('searchbox').fill('Section Focus')
    await page.getByRole('button', { name: /Section Focus/ }).click()
    await page.getByRole('button', { name: 'Preview HTML' }).click()
    await page.frameLocator('#code-preview').locator('[data-af-entered]').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Copy JavaScript' }).isEnabled(), true)
    page.once('dialog', (dialog) => dialog.accept())
    const [logout] = await Promise.all([
      page.waitForResponse((response) => response.url() === origin + '/auth/logout'),
      page.getByRole('button', { name: 'Sign out' }).click(),
    ])
    assert.equal(logout.status(), 303)
    await page.getByRole('link', { name: 'Continue with Hack Club' }).waitFor()
    assert.equal((await page.request.get(origin + '/api/projects')).status(), 401)
  } finally {
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
    storage.close()
  }
})
