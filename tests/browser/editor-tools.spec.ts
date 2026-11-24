import { expect, test } from '@playwright/test'

test('edits the same plan with tools, snaps, history and synchronized 3D selection', async ({ page }) => {
  await page.goto('/tests/browser/mock.html?mode=error')
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 200
    return canvas.toDataURL().split(',')[1]
  })
  await page.getByLabel('Подложка плана').setInputFiles({
    name: 'plan.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64'),
  })
  await expect(page.getByRole('alert')).toHaveText('Тестовая ошибка модели.')
  const plan = page.getByRole('img', { name: 'План этажа в 2D' })
  const tool = (name: string) => page.getByRole('button', { name, exact: true })
  const property = page.getByRole('complementary', { name: 'Свойства объекта' })
  const at = async (x: number, y: number) => {
    await plan.scrollIntoViewIfNeeded()
    const box = (await plan.boundingBox())!
    return { x: box.x + box.width * x / 400, y: box.y + box.height * y / 200 }
  }
  const click = async (x: number, y: number) => {
    const p = await at(x, y)
    await page.mouse.click(p.x, p.y)
  }
  const drag = async (x: number, y: number, toX: number, toY: number) => {
    const a = await at(x, y)
    const b = await at(toX, toY)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(b.x, b.y, { steps: 8 })
    await page.mouse.up()
  }
  await tool('Measure').click()
  await click(100, 50)
  await click(300, 50)
  await expect(page.getByText(/Расстояние: (199|200)\.\d+ px/)).toBeVisible()
  await tool('Select').click()
  await click(100, 50)
  await click(300, 50)
  await page.getByLabel('Расстояние, м').fill('4')
  await tool('Задать масштаб').click()
  await page.getByLabel('Высота стен, м').fill('3')
  await page.getByLabel('Высота стен, м').press('Enter')
  await tool('Привязка к сетке').click()
  await click(103, 98)
  await expect(page.getByText('Отметьте конец стены.')).toBeVisible()
  await click(297, 101)
  await expect(page.getByRole('button', { name: /Стена 1 · 4.00 м/ })).toBeVisible()
  await tool('Select').click()
  await click(200, 100)
  await expect(property.getByText('ID стены')).toBeVisible()
  await expect(property.getByLabel('Длина стены, м')).toHaveValue('4')

  await tool('Move').click()
  await drag(200, 100, 200, 125)
  await expect(property.getByRole('group', { name: 'Начало' }).getByLabel('Y, м')).toHaveValue('2.5')
  await page.keyboard.press('Meta+z')
  await expect(property.getByRole('group', { name: 'Начало' }).getByLabel('Y, м')).toHaveValue('2')
  await page.keyboard.press('Meta+Shift+z')
  await expect(property.getByRole('group', { name: 'Начало' }).getByLabel('Y, м')).toHaveValue('2.5')

  await tool('Vertex').click()
  await drag(300, 125, 275, 125)
  await expect(property.getByText('ID вершины')).toBeVisible()
  await expect(property.getByLabel('X, м')).toHaveValue('5.5')
  await property.getByLabel('X, м').fill('5.6')
  await property.getByLabel('X, м').press('Enter')
  await tool('Wall').click()
  await click(279, 125)
  await click(275, 75)
  await tool('Vertex').click()
  await expect(plan.getByLabel('Вершина на плане')).toHaveCount(3)
  await page.getByRole('button', { name: /Undo/ }).click()
  await expect(page.getByRole('button', { name: /^Стена 2 ·/ })).toHaveCount(0)

  await tool('Pan').click()
  const originalBox = await plan.getAttribute('viewBox')
  await drag(180, 80, 200, 95)
  await expect(plan).not.toHaveAttribute('viewBox', originalBox!)
  await plan.hover()
  await page.mouse.wheel(0, -150)
  await expect(page.locator('footer')).not.toContainText('Вид 100%')
  await tool('Сброс вида').click()
  await expect(plan).toHaveAttribute('viewBox', originalBox!)

  await tool('Select').click()
  await click(200, 125)
  const id = await property.locator('code').innerText()
  await tool('3D').click()
  await expect(property.locator('code')).toHaveText(id)
  await tool('Вид сверху').click()
  const scene = page.getByRole('region', { name: 'Модель этажа в 3D' })
  const canvas = scene.locator('canvas')
  await expect(canvas).toBeVisible()
  const box = (await canvas.boundingBox())!
  await page.mouse.click(box.x + 20, box.y + 20)
  await expect(property.getByText('Выберите стену или вершину.')).toBeVisible()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(property.locator('code')).toHaveText(id)
  await tool('Перспектива').click()
  await tool('2D').click()
  await expect(property.locator('code')).toHaveText(id)

  const length = property.getByLabel('Длина стены, м')
  await length.fill('0')
  await length.press('Enter')
  await expect(page.getByText('Операция создаёт недопустимую геометрию. Проверьте координаты и размеры.')).toBeVisible()
  await expect(length).toHaveValue('3.6')
  await length.fill('5')
  await length.press('Enter')
  await expect(page.getByRole('button', { name: /Стена 1 · 5.00 м/ })).toBeVisible()
  await page.keyboard.press('Delete')
  await expect(page.getByRole('button', { name: /^Стена 1 ·/ })).toHaveCount(0)
})
