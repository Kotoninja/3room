import { expect, test } from 'vitest'
import { distance, usePlan } from '../../src/plan'

test('moves, resizes and deletes a wall with reversible geometry; invalid edits preserve redo', () => {
  const plan = usePlan.getState()
  plan.loadUnderlay({ url: 'plan.png', width: 400, height: 300 })
  expect(plan.calibrate({ x: 0, y: 0 }, { x: 100, y: 0 }, 5)).toBe(true)
  expect(plan.addWall({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.2)).toBe(true)
  const [wall] = usePlan.getState().walls
  expect(plan.moveWall(wall.id, { x: 20, y: 40 })).toBe(true)
  expect(usePlan.getState().vertices[wall.startId]).toEqual({ x: 1, y: 2 })
  expect(plan.resizeWall(wall.id, 8)).toBe(true)
  expect(plan.setWallThickness(wall.id, 0.4)).toBe(true)
  plan.undo()
  expect(usePlan.getState().walls[0].thickness).toBe(0.2)
  expect(plan.resizeWall(wall.id, 0)).toBe(false)
  expect(plan.moveVertex(wall.endId, { x: 20, y: 40 })).toBe(false)
  expect(usePlan.getState().canRedo).toBe(true)
  plan.redo()
  expect(usePlan.getState().walls[0].thickness).toBe(0.4)
  const { vertices } = usePlan.getState()
  expect(distance(vertices[wall.startId], vertices[wall.endId])).toBe(8)
  plan.removeVertex(wall.endId)
  expect(usePlan.getState().walls).toHaveLength(0)
  plan.undo()
  expect(usePlan.getState().walls[0].id).toBe(wall.id)
  plan.loadUnderlay({ url: 'other.png', width: 400, height: 300 })
  expect(usePlan.getState().canUndo || usePlan.getState().canRedo).toBe(false)
})

test('keeps earlier wall edits reversible in metres after calibration', () => {
  const plan = usePlan.getState()
  plan.loadUnderlay({ url: 'plan.png', width: 400, height: 300 })
  plan.applyRecognizedGraph({
    vertices: { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } },
    walls: [{ id: 'wall', startId: 'a', endId: 'b', thickness: 10 }], rejected: [],
  }, [])
  expect(plan.moveVertex('b', { x: 200, y: 0 })).toBe(true)
  expect(plan.calibrate({ x: 0, y: 0 }, { x: 100, y: 0 }, 4)).toBe(true)
  plan.undo()
  expect(usePlan.getState().vertices.b.x).toBe(4)
  expect(usePlan.getState().walls[0].thickness).toBe(0.4)
  plan.redo()
  expect(usePlan.getState().vertices.b.x).toBe(8)
})
