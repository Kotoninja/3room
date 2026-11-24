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

type Geometry = { vertices: Record<string, Point>; walls: Wall[]; wallHeight: number | null }

type Plan = Geometry & {
  underlay: Underlay | null
  metresPerPixel: number | null
  openings: OpeningHint[]
  rejected: Point[]
  loadUnderlay: (underlay: Underlay) => void
  applyRecognizedGraph: (graph: ReturnType<typeof GeometryNormalizer>, openings: OpeningHint[]) => void
  calibrate: (a: Point, b: Point, metres: number) => boolean
  addWall: (a: Point, b: Point, thickness: number) => boolean
  moveVertex: (id: string, point: Point) => boolean
  moveWall: (id: string, delta: Point) => boolean
  resizeWall: (id: string, length: number) => boolean
  removeWall: (id: string) => void
  removeVertex: (id: string) => void
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  setWallHeight: (height: number) => boolean
  setWallThickness: (id: string, thickness: number) => boolean
}

const scalePoint = ({ x, y }: Point, scale: number) => ({ x: x * scale, y: y * scale })
const findVertex = (vertices: Plan['vertices'], point: Point) =>
  Object.entries(vertices).find(([, vertex]) => distance(vertex, point) < 1e-8)?.[0]
const wallKey = ({ startId, endId }: Wall) => [startId, endId].sort().join(':')

const snapshot = ({ vertices, walls, wallHeight }: Geometry): Geometry => ({ vertices, walls, wallHeight })

export const usePlan = create<Plan>((set, get) => {
  const past: Geometry[] = []
  const future: Geometry[] = []
  function resetHistory() {
    past.length = 0
    future.length = 0
    return { canUndo: false, canRedo: false }
  }
  function commit(change: Partial<Geometry>) {
    past.push(snapshot(get()))
    if (past.length > 100) past.shift()
    future.length = 0
    set({ ...change, canUndo: true, canRedo: false })
  }
  function relocate(changes: Record<string, Point>) {
    const { vertices, walls } = get()
    if (Object.values(changes).some(point => !finitePoint(point))) return false
    if (Object.entries(changes).every(([id, point]) => distance(vertices[id], point) < 1e-8)) return true

    const next = { ...vertices, ...changes }
    const stationary = Object.fromEntries(Object.entries(vertices).filter(([id]) => !(id in changes)))
    const targets = Object.fromEntries(Object.entries(changes).map(([id, point]) => [
      id, findVertex(stationary, point) ?? id,
    ]))
    const joined = walls.map(wall => {
      const startId = targets[wall.startId] ?? wall.startId
      const endId = targets[wall.endId] ?? wall.endId
      return startId === wall.startId && endId === wall.endId ? wall : { ...wall, startId, endId }
    })
    if (joined.some(({ startId, endId }) => {
      const length = distance(next[startId], next[endId])
      return !isPositive(length) || length < 1e-8
    }) || new Set(joined.map(wallKey)).size !== joined.length) return false
    for (const [id, target] of Object.entries(targets)) if (target !== id) delete next[id]
    commit({ vertices: next, walls: joined })
    return true
  }
  function removeWalls(matches: (wall: Wall) => boolean) {
    const current = get()
    const walls = current.walls.filter(wall => !matches(wall))
    if (walls.length === current.walls.length) return
    const used = new Set(walls.flatMap(wall => [wall.startId, wall.endId]))
    commit({ walls, vertices: Object.fromEntries(Object.entries(current.vertices).filter(([id]) => used.has(id))) })
  }
  return {
    underlay: null, metresPerPixel: null, vertices: {}, walls: [], wallHeight: null,
    openings: [], rejected: [], canUndo: false, canRedo: false,
    undo: () => {
      const previous = past.pop()
      if (!previous) return
      future.push(snapshot(get()))
      set({ ...previous, canUndo: Boolean(past.length), canRedo: true })
    },
    redo: () => {
      const next = future.pop()
      if (!next) return
      past.push(snapshot(get()))
      set({ ...next, canUndo: true, canRedo: Boolean(future.length) })
    },
    loadUnderlay: underlay => set({
      underlay, metresPerPixel: null, vertices: {}, walls: [], wallHeight: null,
      openings: [], rejected: [], ...resetHistory(),
    }),
    applyRecognizedGraph: (graph, openings) => {
      if (!get().underlay || get().metresPerPixel || get().walls.length) return
      set({ ...graph, openings, ...resetHistory() })
    },
    calibrate: (a, b, metres) => {
      const current = get()
      const scale = metres / distance(a, b)
      if (!current.underlay || current.metresPerPixel || !isPositive(metres) || !isPositive(scale)) return false
      function convert(geometry: Geometry): Geometry | null {
        const vertices = Object.entries(geometry.vertices).map(([id, point]) => [id, scalePoint(point, scale)] as const)
        const walls = geometry.walls.map(wall => ({ ...wall, thickness: wall.thickness * scale }))
        if (vertices.some(([, p]) => !finitePoint(p)) || walls.some(wall => !isPositive(wall.thickness))) return null
        const scaled = Object.fromEntries(vertices)
        if (walls.some(wall => !isPositive(distance(scaled[wall.startId], scaled[wall.endId])))) return null
        return { vertices: scaled, walls, wallHeight: geometry.wallHeight }
      }
      const scaled = convert(current)
      const scaledPast = past.map(convert).filter(item => item !== null)
      const scaledFuture = future.map(convert).filter(item => item !== null)
      if (!scaled || scaledPast.length !== past.length || scaledFuture.length !== future.length) return false
      past.splice(0, past.length, ...scaledPast)
      future.splice(0, future.length, ...scaledFuture)
      set({ ...scaled, metresPerPixel: scale })
      return true
    },
    addWall: (a, b, thickness) => {
      const { underlay, metresPerPixel, vertices, walls } = get()
      if (!underlay || !metresPerPixel || !isPositive(thickness)) return false
      const start = scalePoint(a, metresPerPixel ?? 1)
      const end = scalePoint(b, metresPerPixel ?? 1)
      if (!finitePoint(start) || !finitePoint(end) || distance(start, end) < 1e-8 || !isPositive(distance(start, end))) return false
      const startId = findVertex(vertices, start) ?? crypto.randomUUID()
      const endId = findVertex(vertices, end) ?? crypto.randomUUID()
      const wall = { id: crypto.randomUUID(), startId, endId, thickness }
      if (startId === endId || walls.some(item => wallKey(item) === wallKey(wall))) return false
      commit({ walls: [...walls, wall], vertices: { ...vertices, [startId]: vertices[startId] ?? start, [endId]: vertices[endId] ?? end } })
      return true
    },
    moveVertex: (id, point) => Boolean(get().vertices[id]) && relocate({ [id]: scalePoint(point, get().metresPerPixel ?? 1) }),
    moveWall: (id, delta) => {
      const { walls, vertices, metresPerPixel } = get()
      const wall = walls.find(item => item.id === id)
      if (!wall) return false
      const offset = scalePoint(delta, metresPerPixel ?? 1)
      const translate = (vertex: string) => ({ x: vertices[vertex].x + offset.x, y: vertices[vertex].y + offset.y })
      return relocate({ [wall.startId]: translate(wall.startId), [wall.endId]: translate(wall.endId) })
    },
    resizeWall: (id, length) => {
      const { walls, vertices } = get()
      const wall = walls.find(item => item.id === id)
      if (!wall || !isPositive(length)) return false
      const a = vertices[wall.startId]
      const b = vertices[wall.endId]
      const ratio = length / distance(a, b)
      return relocate({ [wall.endId]: { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio } })
    },
    removeWall: id => removeWalls(wall => wall.id === id),
    removeVertex: id => removeWalls(wall => wall.startId === id || wall.endId === id),
    setWallHeight: wallHeight => {
      if (!isPositive(wallHeight) || !get().metresPerPixel) return false
      if (get().wallHeight !== wallHeight) commit({ wallHeight })
      return true
    },
    setWallThickness: (id, thickness) => {
      const { walls } = get()
      const wall = walls.find(item => item.id === id)
      if (!wall || !isPositive(thickness)) return false
      if (wall.thickness !== thickness) commit({ walls: walls.map(item => item.id === id ? { ...item, thickness } : item) })
      return true
    },
  }
})
