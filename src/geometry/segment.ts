import type { Vec2 } from '../model/types'
import { add, cross, dist, dot, len, normalize, scale, sub } from './vec'

export const GEOMETRY_EPSILON = 1e-6

export function projectPointOnSegment(p: Vec2, a: Vec2, b: Vec2) {
  const ab = sub(b, a)
  const length = len(ab)
  const t =
    length === 0
      ? 0
      : Math.max(0, Math.min(1, dot(sub(p, a), normalize(ab)) / length))
  const point = t === 0 ? { ...a } : t === 1 ? { ...b } : add(a, scale(ab, t))
  return { point, t, distance: dist(p, point) }
}

export function segmentIntersection(
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
): Vec2 | null {
  const a = sub(a2, a1)
  const b = sub(b2, b1)
  const delta = sub(b1, a1)
  const determinant = cross(a, b)
  const determinantRoundoff =
    4 * Number.EPSILON * (Math.abs(a.x * b.y) + Math.abs(a.y * b.x))

  if (Math.abs(determinant) > determinantRoundoff) {
    const t = cross(delta, b) / determinant
    const u = cross(delta, a) / determinant
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return add(a1, scale(a, t))
  } else if (len(a) > 0 && len(b) > 0) {
    const axis = normalize(a)
    if (
      Math.abs(cross(axis, delta)) <= GEOMETRY_EPSILON &&
      Math.abs(cross(axis, sub(b2, a1))) <= GEOMETRY_EPSILON
    ) {
      const coordinate = Math.abs(a.x) >= Math.abs(a.y) ? 'x' : 'y'
      const overlap =
        Math.min(
          Math.max(a1[coordinate], a2[coordinate]),
          Math.max(b1[coordinate], b2[coordinate]),
        ) -
        Math.max(
          Math.min(a1[coordinate], a2[coordinate]),
          Math.min(b1[coordinate], b2[coordinate]),
        )
      // A shared span has no unique intersection point.
      if (overlap > 0) return null
    }
  }

  const contacts = [
    projectPointOnSegment(a1, b1, b2),
    projectPointOnSegment(a2, b1, b2),
    projectPointOnSegment(b1, a1, a2),
    projectPointOnSegment(b2, a1, a2),
  ]
  const nearest = contacts.reduce((best, candidate) =>
    candidate.distance < best.distance ? candidate : best,
  )
  return nearest.distance <= GEOMETRY_EPSILON ? nearest.point : null
}
