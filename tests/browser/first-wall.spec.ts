import { expect, test } from '@playwright/test'

for (const format of ['png', 'jpeg']) {
  test(`владелец строит стену по ${format.toUpperCase()} и осматривает её в 3D`, async ({ page }) => {
    const errors: Error[] = []
    page.on('pageerror', (error) => errors.push(error))
    await page.goto('/tests/browser/mock.html?mode=error')
    const image = await page.evaluate((format) => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 200
      const context = canvas.getContext('2d')!
      context.fillStyle = 'white'
      context.fillRect(0, 0, 400, 200)
      context.strokeRect(40, 40, 320, 120)
      return canvas.toDataURL(`image/${format}`).split(',')[1]
    }, format)
    await page.getByLabel('Подложка плана').setInputFiles({
      name: `plan.${format}`,
      mimeType: `image/${format}`,
      buffer: Buffer.from(image, 'base64'),
    })

    await expect(page.getByRole('alert')).toHaveText('Тестовая ошибка модели.')
    const plan = page.getByRole('img', { name: 'План этажа в 2D' })
    const box = (await plan.boundingBox())!
    const click = (x: number, y: number) => page.mouse.click(box.x + box.width * x, box.y + box.height * y)
    await click(0.25, 0.25)
    await click(0.75, 0.25)
    await page.getByLabel('Расстояние, м').fill('4')
    await page.getByRole('button', { name: 'Задать масштаб' }).click()
    await page.getByLabel('Толщина стены, м').fill('0.3')
    await page.getByLabel('Высота стен, м').fill('3.5')
    await click(0.25, 0.5)
    await click(0.75, 0.5)
    await expect(page.getByText('Стена 1 · 4.00 м · толщина 0.30 м')).toBeVisible()
    await page.getByRole('button', { name: '3D', exact: true }).click()
    const scene = page.getByRole('region', { name: 'Модель этажа в 3D' })
    const canvas = scene.locator('canvas')
    await expect(canvas).toBeVisible()
    await expect(scene.getByText('Высота стен 3.50 м')).toBeVisible()
    await page.getByRole('button', { name: 'Стена 1 · 4.00 м · толщина 0.30 м' }).click()
    await page.getByLabel('Толщина стены, м').fill('0.45')
    await page.getByLabel('Высота стен, м').fill('4')
    await expect(scene.getByText('Высота стен 4.00 м')).toBeVisible()
    const viewport = (await canvas.boundingBox())!
    await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2)
    await page.mouse.down()
    await page.mouse.move(viewport.x + viewport.width / 2 + 70, viewport.y + viewport.height / 2 + 30, { steps: 8 })
    await page.mouse.up()
    await page.getByRole('button', { name: '2D', exact: true }).click()
    await expect(page.getByText('Стена 1 · 4.00 м · толщина 0.45 м')).toBeVisible()
    expect(errors).toEqual([])
  })
}
