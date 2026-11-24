import { existsSync } from 'node:fs'
import { basename } from 'node:path'
import { expect, test } from '@playwright/test'

const blankPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64')

test('rejects unsupported files and lets the owner fix a partial result', async ({ page }) => {
  await page.goto('/tests/browser/mock.html?mode=partial')
  const upload = page.getByLabel('Подложка плана')
  await upload.setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7') })
  await expect(page.getByRole('alert')).toHaveText('Выберите изображение PNG или JPEG.')
  const payload = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 200
    return canvas.toDataURL().split(',')[1]
  })
  await upload.setInputFiles({ name: 'plan.png', mimeType: 'image/png', buffer: Buffer.from(payload, 'base64') })
  await expect(page.getByText('Замкнутые помещения: 0')).toBeVisible()
  await expect(page.getByText('Проверьте отмеченные разрывы, пересечения и отброшенные участки.')).toBeVisible()
  const wall = page.getByRole('button', { name: /Стена 1 · 200.00 px/ })
  await wall.click()
  await page.getByRole('button', { name: 'Переместить начало' }).click()
  const plan = page.getByRole('img', { name: 'План этажа в 2D' })
  const box = (await plan.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.25)
  await expect(page.getByRole('button', { name: /Стена 1 · (99|100)\.\d+ px/ })).toBeVisible()
  await page.getByRole('button', { name: 'Удалить стену' }).click()
  await expect(page.getByRole('button', { name: /Стена 1 · (99|100)\.\d+ px/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Стена 2 ·/ })).toHaveCount(0)

  await upload.setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from(payload, 'base64') })
  await expect(page.getByRole('alert')).toContainText('Модель не нашла пригодных стен.')
  await expect(page.getByRole('button', { name: /Стена 1 · (99|100)\.\d+ px/ })).toBeVisible()

  await upload.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') })
  await expect(page.getByRole('alert')).toHaveText('Не удалось открыть изображение.')
  await expect(plan).toBeVisible()
  await expect(page.getByRole('button', { name: /Стена 1 ·/ })).toBeVisible()
})

const hasModel = existsSync('public/models/floorplannet_lite.onnx')
const realPlans = process.env.THREEROOM_TEST_PLANS?.split(',') ?? [process.env.THREEROOM_TEST_PLAN]
for (const realPlan of realPlans) {
test(realPlan ? `opens calibrated real ONNX geometry in 3D (${basename(realPlan)})`
  : 'reports an empty result from real ONNX without inventing walls', async ({ page, baseURL }, testInfo) => {
  test.skip(!hasModel, 'Run npm run prepare:recognition to enable the real model test.')
  test.setTimeout(90_000)
  const external: string[] = []
  const seen: string[] = []
  const origin = new URL(baseURL!).origin
  page.on('pageerror', error => console.error(error.message))
  await page.context().route('**/*', route => {
    const address = new URL(route.request().url())
    if (address.origin !== origin) {
      external.push(address.href)
      return route.abort()
    }
    seen.push(address.pathname)
    return route.continue()
  })
  await page.goto('/')
  const upload = page.getByLabel('Подложка плана')
  if (realPlan) {
    await upload.setInputFiles(realPlan)
  } else {
    const image = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 384
      const context = canvas.getContext('2d')!
      context.fillStyle = 'white'
      context.fillRect(0, 0, 512, 384)
      context.strokeStyle = 'black'
      context.lineWidth = 12
      context.strokeRect(45, 45, 420, 290)
      return canvas.toDataURL().split(',')[1]
    })
    await upload.setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') })
  }

  const firstWall = page.getByRole('button', { name: /Стена 1 · .* px/ })
  const failure = page.getByRole('alert')
  await expect(firstWall.or(failure)).toBeVisible({ timeout: 65_000 })
  expect(seen.some(url => url.endsWith('floorplannet_lite.onnx'))).toBe(true)
  expect(seen.some(url => url.endsWith('.wasm'))).toBe(true)
  expect(external).toEqual([])
  if (!realPlan) {
    await expect(failure).toHaveText('Стены не найдены. Можно продолжить вручную.')
    await expect(page.getByLabel('Расстояние, м')).toBeEnabled()
    await expect(firstWall).toHaveCount(0)
    return
  }
  if (await failure.isVisible()) throw new Error(await failure.innerText())
  await expect(page.getByText(/Замкнутые помещения: [1-9]/)).toBeVisible()
  const plan = page.getByRole('img', { name: 'План этажа в 2D' })
  const wallCount = await page.getByRole('button', { name: /^Стена \d+ ·/ }).count()
  console.log(`${realPlan ? basename(realPlan) : 'controlled plan'}: ${wallCount} walls; ${await page.getByText(/^Замкнутые помещения:/).innerText()}; ${await page.getByText(/^Инференс /).innerText()}`)
  await testInfo.attach('recognition-overlay', { body: await plan.screenshot(), contentType: 'image/png' })
  const box = (await plan.boundingBox())!
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.2)
  await page.getByLabel('Расстояние, м').fill('5')
  await page.getByRole('button', { name: 'Задать масштаб' }).click()
  await page.getByLabel('Высота стен, м').fill('3')
  await page.getByLabel('Высота стен, м').press('Enter')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Модель этажа в 3D' }).locator('canvas')).toBeVisible()
  expect(external).toEqual([])
})
}

test('keeps the manual editor usable when the checkpoint is unavailable', async ({ page }) => {
  await page.route('**/models/floorplannet_lite.onnx', route => route.fulfill({ status: 404 }))
  await page.goto('/')
  await page.getByLabel('Подложка плана').setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: blankPng })
  await expect(page.getByRole('alert')).toContainText('Не найдены веса', { timeout: 15_000 })
  await expect(page.getByLabel('Расстояние, м')).toBeEnabled()
})
