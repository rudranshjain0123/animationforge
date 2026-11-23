import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'
import { chromium } from 'playwright-core'
import { createApp } from '../server/app.js'
import { openStorage } from '../server/storage.js'
import { effects, exportHtml } from '../src/effects.js'

const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' })
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex')

test('all 125 exports animate visibly in offline Chromium', { timeout: 180_000 }, async () => {
  const browser = await launch()
  try {
    const context = await browser.newContext({ offline: true, viewport: { width: 360, height: 160 }, reducedMotion: 'no-preference' })
    const page = await context.newPage()
    const motions = new Map()
    for (const effect of effects) {
      await page.setContent(exportHtml(effect, { background: 'transparent', text: 'MOTION' }))
      const imageHashes = []
      for (const fraction of [.13, .37, .64, .88]) {
        const info = await page.evaluate(async (position) => {
          const animations = document.getAnimations()
          const box = document.body.firstElementChild
          for (const animation of animations) {
            animation.pause()
            await animation.ready
            const { duration, delay } = animation.effect.getTiming()
            animation.currentTime = duration * position + Math.max(0, delay)
          }
          return { count: animations.length, background: getComputedStyle(box).backgroundColor }
        }, fraction)
        assert.ok(info.count, `${effect.name} has no browser animation`)
        assert.equal(info.background, 'rgba(0, 0, 0, 0)', effect.name)
        imageHashes.push(hash(await page.screenshot()))
      }
      assert.ok(new Set(imageHashes).size > 1, `${effect.name} has no visible frame changes`)
      const signature = imageHashes.join('')
      assert.ok(!motions.has(signature), `${effect.name} renders like ${motions.get(signature)}`)
      motions.set(signature, effect.name)
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0)
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
    await page.getByRole('searchbox').fill('Dot Parade')
    await page.getByRole('button', { name: /Dot Parade/ }).click()
    await page.getByRole('button', { name: '☆ Favorite' }).click()
    await page.getByRole('button', { name: '★ Favorited' }).waitFor()
    await page.getByLabel('Background', { exact: true }).selectOption('transparent')
    await page.getByRole('button', { name: 'Pause' }).click()
    assert.equal(await page.locator('#preview [data-paused]').count(), 1)
    await page.getByRole('button', { name: 'Preview HTML' }).click()
    assert.match(await page.locator('#source').textContent(), /--fill:transparent/)
    await page.frameLocator('#code-preview').locator('.af-dots').waitFor()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download HTML' }).click()])
    assert.equal(download.suggestedFilename(), 'dots.html')
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
    await page.setViewportSize({ width: 390, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
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
