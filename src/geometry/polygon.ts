import type { Vec2 } from '../model/types'
import { GEOMETRY_EPSILON, projectPointOnSegment } from './segment'
import { add, cross, scale, sub } from './vec'

function polygonMoments(poly: readonly Vec2[]) {
  const origin = poly[0] ?? { x: 0, y: 0 }
  let twiceArea = 0
  let productMagnitude = 0
  let moment = { x: 0, y: 0 }
  for (let i = 0; i < poly.length; i++) {
    const a = sub(poly[i], origin)
    const b = sub(poly[(i + 1) % poly.length], origin)
    const weight = cross(a, b)
    twiceArea += weight
    productMagnitude += Math.abs(a.x * b.y) + Math.abs(a.y * b.x)
    moment = add(moment, scale(add(a, b), weight))
  }
  const areaRoundoff = 4 * Number.EPSILON * productMagnitude
  return {
    origin,
    twiceArea: Math.abs(twiceArea) <= areaRoundoff ? 0 : twiceArea,
    moment,
  }
}

export function polygonArea(poly: readonly Vec2[]): number {
  return polygonMoments(poly).twiceArea / 2
}

export function centroid(poly: readonly Vec2[]): Vec2 {
  const { origin, twiceArea, moment } = polygonMoments(poly)
  if (twiceArea !== 0) return add(origin, scale(moment, 1 / (3 * twiceArea)))
  if (poly.length === 0) return origin
  const total = poly.reduce((sum, point) => add(sum, sub(point, origin)), {
    x: 0,
    y: 0,
  })
  return add(origin, scale(total, 1 / poly.length))
}

export function pointInPolygon(point: Vec2, poly: readonly Vec2[]): boolean {
  if (poly.length < 3 || polygonArea(poly) === 0) return false
  let inside = false
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    if (projectPointOnSegment(point, a, b).distance <= GEOMETRY_EPSILON)
      return true
    const crossesScanline = a.y > point.y !== b.y > point.y
    if (crossesScanline) {
      const crossingX = a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y)
      if (point.x < crossingX) inside = !inside
    }
  }
  return inside
}
