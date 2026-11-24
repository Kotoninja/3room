import { create } from 'zustand'
import { distance, finitePoint, GeometryNormalizer } from './recognition/geometry'
import type { OpeningHint } from './recognition/types'

export { distance }
export type Point = { x: number; y: number }
export type Underlay = { url: string; width: number; height: number }
export type Wall = { id: string; startId: string; endId: string; thickness: number }

export function isPositive(value: number) {
  return Number.isFinite(value) && value > 0
}

type Plan = {
  underlay: Underlay | null
  metresPerPixel: number | null
  vertices: Record<string, Point>
  walls: Wall[]
  wallHeight: number | null
  openings: OpeningHint[]
  rejected: Point[]
  loadUnderlay: (underlay: Underlay) => void
  applyRecognizedGraph: (graph: ReturnType<typeof GeometryNormalizer>, openings: OpeningHint[]) => void
  calibrate: (a: Point, b: Point, metres: number) => boolean
  addWall: (a: Point, b: Point, thickness: number) => boolean
  moveVertex: (id: string, point: Point) => boolean
  removeWall: (id: string) => void
  setWallHeight: (height: number) => void
  setWallThickness: (id: string, thickness: number) => void
}

const scalePoint = ({ x, y }: Point, scale: number) => ({ x: x * scale, y: y * scale })
const findVertex = (vertices: Plan['vertices'], point: Point) =>
  Object.entries(vertices).find(([, vertex]) => distance(vertex, point) < 1e-8)?.[0]
const wallKey = ({ startId, endId }: Wall) => [startId, endId].sort().join(':')

export const usePlan = create<Plan>((set, get) => ({
  underlay: null,
  metresPerPixel: null,
  vertices: {},
  walls: [],
  wallHeight: null,
  openings: [],
  rejected: [],
  loadUnderlay: (underlay) => set({
    underlay, metresPerPixel: null, vertices: {}, walls: [], wallHeight: null, openings: [], rejected: [],
  }),
  applyRecognizedGraph: (graph, openings) => {
    if (!get().underlay || get().metresPerPixel || get().walls.length) return
    set({ ...graph, openings })
  },
  calibrate: (a, b, metres) => {
    const { underlay, metresPerPixel, vertices, walls } = get()
    const scale = metres / distance(a, b)
    if (!underlay || metresPerPixel || !isPositive(metres) || !isPositive(scale)) return false
    const converted = Object.entries(vertices).map(([id, point]) => [id, scalePoint(point, scale)] as const)
    const scaledWalls = walls.map(wall => ({ ...wall, thickness: wall.thickness * scale }))
    if (converted.some(([, p]) => !finitePoint(p)) || scaledWalls.some(wall => !isPositive(wall.thickness))) return false
    set({ metresPerPixel: scale, vertices: Object.fromEntries(converted), walls: scaledWalls })
    return true
  },
  addWall: (a, b, thickness) => {
    const { metresPerPixel, vertices, walls } = get()
    if (!metresPerPixel || !isPositive(thickness)) return false
    const start = scalePoint(a, metresPerPixel)
    const end = scalePoint(b, metresPerPixel)
    if (!finitePoint(start) || !finitePoint(end) || !isPositive(distance(start, end))) return false
    const startId = findVertex(vertices, start) ?? crypto.randomUUID()
    const endId = findVertex(vertices, end) ?? crypto.randomUUID()
    const wall = { id: crypto.randomUUID(), startId, endId, thickness }
    if (startId === endId || walls.some(item => wallKey(item) === wallKey(wall))) return false
    set({
      walls: [...walls, wall],
      vertices: { ...vertices, [startId]: vertices[startId] ?? start, [endId]: vertices[endId] ?? end },
    })
    return true
  },
  moveVertex: (id, point) => {
    const { vertices, walls, metresPerPixel } = get()
    const next = scalePoint(point, metresPerPixel ?? 1)
    if (!vertices[id] || !finitePoint(next)) return false
    if (walls.some(wall => {
      const other = wall.startId === id ? wall.endId : wall.endId === id ? wall.startId : null
      return other !== null && distance(vertices[other], next) < 1e-8
    })) return false
    const target = findVertex(vertices, next)
    if (target && target !== id) {
      const joined = walls.map(wall => ({
        ...wall,
        startId: wall.startId === id ? target : wall.startId,
        endId: wall.endId === id ? target : wall.endId,
      }))
      if (new Set(joined.map(wallKey)).size !== joined.length) return false
      const remaining = { ...vertices }
      delete remaining[id]
      set({ vertices: remaining, walls: joined })
      return true
    }
    set({ vertices: { ...vertices, [id]: next } })
    return true
  },
  removeWall: (id) => {
    const walls = get().walls.filter(wall => wall.id !== id)
    const used = new Set(walls.flatMap(wall => [wall.startId, wall.endId]))
    set({ walls, vertices: Object.fromEntries(Object.entries(get().vertices).filter(([key]) => used.has(key))) })
  },
  setWallHeight: (wallHeight) => {
    if (isPositive(wallHeight)) set({ wallHeight })
  },
  setWallThickness: (id, thickness) => {
    if (!isPositive(thickness)) return
    set(({ walls }) => ({ walls: walls.map(wall => wall.id === id ? { ...wall, thickness } : wall) }))
  },
}))
