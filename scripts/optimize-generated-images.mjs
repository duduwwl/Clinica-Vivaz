import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const pairs = process.argv.slice(2)
if (!pairs.length || pairs.length % 2 !== 0) {
  throw new Error('Uso: node scripts/optimize-generated-images.mjs <entrada.png> <saida-sem-extensao> [...]')
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
const page = await browser.newPage()

for (let i = 0; i < pairs.length; i += 2) {
  const source = pairs[i]
  const target = pairs[i + 1]
  const input = `data:image/png;base64,${fs.readFileSync(source).toString('base64')}`
  const encoded = await page.evaluate(async ({ input }) => {
    const image = new Image()
    image.src = input
    await image.decode()

    const render = (width, type, quality) => {
      const height = Math.round((image.naturalHeight / image.naturalWidth) * width)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { alpha: false })
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(image, 0, 0, width, height)
      return canvas.toDataURL(type, quality).split(',')[1]
    }

    return {
      jpg: render(image.naturalWidth, 'image/jpeg', 0.94),
      webp: render(image.naturalWidth, 'image/webp', 0.9),
      small: render(Math.min(560, image.naturalWidth), 'image/webp', 0.84),
    }
  }, { input })

  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(`${target}.jpg`, Buffer.from(encoded.jpg, 'base64'))
  fs.writeFileSync(`${target}.webp`, Buffer.from(encoded.webp, 'base64'))
  fs.writeFileSync(`${target}-sm.webp`, Buffer.from(encoded.small, 'base64'))
}

await browser.close()
