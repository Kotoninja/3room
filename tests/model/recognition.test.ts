import { expect, test } from 'vitest'
import { GeometryNormalizer, GeometryValidator } from '../../src/recognition/geometry'
import { usePlan } from '../../src/plan'
import type { CandidateWall } from '../../src/recognition/types'

const segment = (ax: number, ay: number, bx: number, by: number): CandidateWall => ({
  start: { x: ax, y: ay }, end: { x: bx, y: by }, thickness: 4,
})

test('normalizes a near-closed contour, ignores unusable walls and identifies a room', () => {
  const { walls, vertices, rejected } = GeometryNormalizer([
    segment(10, 10, 110, 10), segment(110, 11, 110, 70),
    segment(110, 70, 10, 70), segment(10, 70, 10, 10),
    segment(80, 80, 80, 80),
  ], 2)
  expect(walls).toHaveLength(4)
  expect(Object.keys(vertices)).toHaveLength(4)
  expect(rejected).toHaveLength(1)
  expect(GeometryValidator({ walls, vertices }).rooms).toHaveLength(1)
})

test('splits a recognized boundary at the end of a partition', () => {
  const { walls, vertices } = GeometryNormalizer([
    segment(10, 10, 110, 10), segment(110, 10, 110, 70),
    segment(110, 70, 10, 70), segment(10, 70, 10, 10),
    segment(60, 11, 60, 69),
  ], 2)
  expect(walls).toHaveLength(7)
  expect(GeometryValidator({ walls, vertices }).rooms).toHaveLength(2)
})

test('calibrates recognized coordinates and wall thickness, then edits the same graph', () => {
  const plan = usePlan.getState()
  plan.loadUnderlay({ url: 'plan.png', width: 120, height: 90 })
  plan.applyRecognizedGraph(GeometryNormalizer([segment(10, 10, 110, 10)], 2), [])
  expect(plan.calibrate({ x: 10, y: 10 }, { x: 110, y: 10 }, 5)).toBe(true)
  const { walls: [wall], vertices } = usePlan.getState()
  expect(vertices[wall.endId]).toEqual({ x: 5.5, y: 0.5 })
  expect(wall.thickness).toBeCloseTo(0.2)
  expect(plan.moveVertex(wall.endId, { x: 90, y: 10 })).toBe(true)
  expect(usePlan.getState().vertices[wall.endId].x).toBe(4.5)
  plan.removeWall(wall.id)
  expect(usePlan.getState().walls).toHaveLength(0)
})

test('maps the unpadded predictor coordinates back into the original raster', async () => {
  const { imageCoordinates, recognitionSize } = await import('../../src/recognition/coordinates')
  const { w, h, paddedWidth, paddedHeight } = recognitionSize(1024, 514)
  expect([w, h, paddedWidth, paddedHeight]).toEqual([512, 257, 512, 288])
  expect(imageCoordinates(1024, 514, w, h)([50, 120])).toEqual({ x: 100, y: 240 })
})

test('retains a closed room when an inward partition ends inside it', () => {
  const graph = GeometryNormalizer([
    segment(10, 10, 110, 10), segment(110, 10, 110, 70),
    segment(110, 70, 10, 70), segment(10, 70, 10, 10),
    segment(60, 10, 60, 40),
  ], 0)
  const { rooms, issues } = GeometryValidator(graph)
  expect(rooms).toHaveLength(1)
  expect(issues).toContainEqual({ x: 60, y: 40 })
})

test('repairs a gap by moving an endpoint to an existing vertex', () => {
  const plan = usePlan.getState()
  plan.loadUnderlay({ url: 'plan.png', width: 120, height: 90 })
  const graph = GeometryNormalizer([
    segment(10, 10, 110, 10), segment(110, 10, 110, 70),
    segment(110, 70, 10, 70), segment(10, 70, 10, 16),
  ], 0)
  plan.applyRecognizedGraph(graph, [])
  expect(GeometryValidator(usePlan.getState()).rooms).toHaveLength(0)
  expect(plan.moveVertex(graph.walls[3].endId, { x: 10, y: 10 })).toBe(true)
  expect(GeometryValidator(usePlan.getState()).rooms).toHaveLength(1)
  expect(Object.keys(usePlan.getState().vertices)).toHaveLength(4)
})
