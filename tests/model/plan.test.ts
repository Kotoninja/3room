import { beforeEach, expect, test } from 'vitest'
import { usePlan } from '../../src/plan'

const start = { x: 20, y: 50 }
const end = { x: 220, y: 50 }

beforeEach(() => {
  usePlan.getState().loadUnderlay({ url: 'plan.png', width: 400, height: 200 })
})

test('калибрует изображение и создаёт стену с координатами в метрах', () => {
  const { calibrate, addWall } = usePlan.getState()
  expect(calibrate(start, end, 4)).toBe(true)
  expect(addWall(start, end, 0.3)).toBe(true)
  const { walls: [wall], vertices } = usePlan.getState()
  expect(vertices[wall.startId]).toEqual({ x: 0.4, y: 1 })
  expect(vertices[wall.endId]).toEqual({ x: 4.4, y: 1 })
  expect(wall.thickness).toBe(0.3)
})

test('отклоняет недопустимую калибровку и стену нулевой длины', () => {
  const { calibrate, addWall } = usePlan.getState()
  expect(calibrate(start, start, 4)).toBe(false)
  expect(calibrate(start, end, -4)).toBe(false)
  expect(addWall(start, end, 0.3)).toBe(false)
  expect(calibrate(start, end, 4)).toBe(true)
  expect(addWall(start, start, 0.3)).toBe(false)
  expect(usePlan.getState().walls).toHaveLength(0)
})
