import type { Point, Wall } from '../plan'
import type { CandidateWall } from './types'

type Graph = { walls: Wall[]; vertices: Record<string, Point> }

export const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)
export const finitePoint = ({ x, y }: Point) => Number.isFinite(x) && Number.isFinite(y)
const positive = (n: number) => Number.isFinite(n) && n > 0

function projection(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)
  return { t, point: { x: a.x + t * dx, y: a.y + t * dy } }
}

export function GeometryNormalizer(candidates: CandidateWall[], tolerance: number) {
  const vertices: Graph['vertices'] = {}
  const walls: Wall[] = []
  const rejected: Point[] = []
  const valid = candidates.filter(({ start, end, thickness }) => {
    if (finitePoint(start) && finitePoint(end) && positive(thickness) && positive(distance(start, end))) return true
    if (finitePoint(start)) rejected.push(start)
    return false
  })

  function vertex(point: Point) {
    const nearby = Object.entries(vertices).filter(([, p]) => distance(p, point) <= tolerance)
      .sort(([, a], [, b]) => distance(a, point) - distance(b, point))[0]
    if (nearby) return nearby[0]
    const id = crypto.randomUUID()
    vertices[id] = point
    return id
  }

  const ends = valid.map(({ start, end }) => [vertex(start), vertex(end)] as const)
  const used = new Set<string>()
  const incident = new Set<string>()
  const points = Object.entries(vertices)
  for (const [index, [startId, endId]] of ends.entries()) {
    const start = vertices[startId]
    const end = vertices[endId]
    if (startId === endId) {
      rejected.push(start)
      continue
    }
    const cuts = points
      .filter(([id]) => id !== startId && id !== endId)
      .map(([id, point]) => ({ id, point, projected: projection(point, start, end) }))
      .filter(({ point, projected }) => projected.t > 0 && projected.t < 1 && distance(point, projected.point) <= tolerance)
      .sort((a, b) => a.projected.t - b.projected.t)
    const ids = [startId, ...cuts.map(({ id }) => id), endId]
    for (let j = 1; j < ids.length; j++) {
      const a = ids[j - 1]
      const b = ids[j]
      const key = [a, b].sort().join(':')
      if (used.has(key)) {
        rejected.push(vertices[a])
        continue
      }
      used.add(key)
      incident.add(a)
      incident.add(b)
      walls.push({ id: crypto.randomUUID(), startId: a, endId: b, thickness: valid[index].thickness })
    }
  }
  return { walls, vertices: Object.fromEntries(points.filter(([id]) => incident.has(id))), rejected }
}

export function GeometryValidator({ walls, vertices }: Graph) {
  const neighbors = new Map<string, string[]>()
  const issues: Point[] = []
  const valid = walls.filter(({ startId, endId, thickness }) => {
    const start = vertices[startId]
    const end = vertices[endId]
    if (start && end && finitePoint(start) && finitePoint(end) && positive(distance(start, end)) && positive(thickness)) return true
    if (start && finitePoint(start)) issues.push(start)
    return false
  })
  const conflict = new Set<string>()
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  for (let i = 0; i < valid.length; i++) {
    const first = valid[i]
    const a = vertices[first.startId]
    const b = vertices[first.endId]
    for (let j = i + 1; j < valid.length; j++) {
      const second = valid[j]
      const c = vertices[second.startId]
      const d = vertices[second.endId]
      const abC = cross(a, b, c)
      const abD = cross(a, b, d)
      const cdA = cross(c, d, a)
      const cdB = cross(c, d, b)
      const epsilon = 1e-8
      const crosses = abC * abD < 0 && cdA * cdB < 0
      const onInterior = (signedArea: number, p: Point, from: Point, to: Point) =>
        Math.abs(signedArea) < epsilon && projection(p, from, to).t > epsilon && projection(p, from, to).t < 1 - epsilon
      const touches = onInterior(abC, c, a, b) || onInterior(abD, d, a, b) || onInterior(cdA, a, c, d) || onInterior(cdB, b, c, d)
      const duplicate = (first.startId === second.startId && first.endId === second.endId) ||
        (first.startId === second.endId && first.endId === second.startId)
      if (crosses || touches || duplicate) {
        conflict.add(first.id)
        conflict.add(second.id)
        issues.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 })
      }
    }
  }
  for (const { id, startId, endId } of valid) {
    if (conflict.has(id)) continue
    neighbors.set(startId, [...(neighbors.get(startId) ?? []), endId])
    neighbors.set(endId, [...(neighbors.get(endId) ?? []), startId])
  }
  for (const [id, adjacent] of neighbors) {
    const origin = vertices[id]
    const angle = (v: string) => Math.atan2(vertices[v].y - origin.y, vertices[v].x - origin.x)
    adjacent.sort((a, b) => angle(a) - angle(b))
    if (adjacent.length === 1) issues.push(origin)
  }

  // Open branches do not bound a face, even when they point into a room.
  const leaves = [...neighbors].filter(([, adjacent]) => adjacent.length === 1).map(([id]) => id)
  for (const leaf of leaves) {
    const [parent] = neighbors.get(leaf) ?? []
    neighbors.delete(leaf)
    const adjacent = neighbors.get(parent)
    if (!adjacent) continue
    const remaining = adjacent.filter(id => id !== leaf)
    neighbors.set(parent, remaining)
    if (remaining.length === 1) leaves.push(parent)
  }

  const visited = new Set<string>()
  const rooms: { id: string; vertexIds: string[] }[] = []
  for (const [start, adjacent] of neighbors) {
    for (const next of adjacent) {
      const contour: string[] = []
      let a = start
      let b = next
      while (!visited.has(a + ':' + b)) {
        visited.add(a + ':' + b)
        contour.push(a)
        const outgoing = neighbors.get(b)!
        const c = outgoing[(outgoing.indexOf(a) + outgoing.length - 1) % outgoing.length]
        a = b
        b = c
      }
      if (a !== start || b !== next || contour.length < 3) continue
      const area = contour.reduce((sum, id, index) => {
        const p = vertices[id]
        const q = vertices[contour[(index + 1) % contour.length]]
        return sum + p.x * q.y - p.y * q.x
      }, 0)
      if (area > 1e-8 && new Set(contour).size === contour.length) {
        rooms.push({ id: [...contour].sort().join(':'), vertexIds: contour })
      }
    }
  }
  return { rooms, issues }
}
