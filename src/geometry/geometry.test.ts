import { describe, expect, it } from 'vitest'
import { centroid, pointInPolygon, polygonArea } from './polygon'
import { projectPointOnSegment, segmentIntersection } from './segment'
import { add, angle, cross, dist, dot, len, normalize, scale, sub } from './vec'

const p = (x: number, y: number) => ({ x, y })

describe('plan vectors', () => {
  it('calculates lengths, arithmetic, products and the plan angle', () => {
    const a = p(3, 4)
    const b = p(1, 2)
    expect(len(a)).toBe(5)
    expect(dist(a, p(0, 0))).toBe(5)
    expect(add(a, b)).toEqual(p(4, 6))
    expect(sub(a, b)).toEqual(p(2, 2))
    expect(scale(b, 3)).toEqual(p(3, 6))
    expect(dot(a, b)).toBe(11)
    expect(cross(a, b)).toBe(2)
    expect(normalize(a)).toEqual(p(0.6, 0.8))
    expect(angle(p(2, 2), p(2, 4))).toBe(Math.PI / 2)
    expect(normalize(p(0, 0))).toEqual(p(0, 0))
  })
})

describe('finite segments', () => {
  it('projects to the interior, clamps both ends and handles a point segment', () => {
    const a = p(0, 0)
    const b = p(4, 0)
    expect(projectPointOnSegment(p(1, 2), a, b)).toEqual({
      point: p(1, 0),
      t: 0.25,
      distance: 2,
    })
    expect(projectPointOnSegment(p(-2, 0), a, b)).toEqual({
      point: a,
      t: 0,
      distance: 2,
    })
    expect(projectPointOnSegment(p(7, 0), a, b)).toEqual({
      point: b,
      t: 1,
      distance: 3,
    })
    expect(projectPointOnSegment(p(3, 4), a, a)).toEqual({
      point: a,
      t: 0,
      distance: 5,
    })
  })

  it('finds X, exact T and endpoint contacts', () => {
    expect(segmentIntersection(p(0, 0), p(4, 4), p(0, 4), p(4, 0))).toEqual(
      p(2, 2),
    )
    expect(segmentIntersection(p(0, 0), p(4, 0), p(2, 3), p(2, 0))).toEqual(
      p(2, 0),
    )
    expect(segmentIntersection(p(0, 0), p(4, 0), p(4, 0), p(5, 0))).toEqual(
      p(4, 0),
    )
    expect(segmentIntersection(p(0, 0), p(1, 1), p(2, 2), p(1, 1))).toEqual(
      p(1, 1),
    )
  })

  it('uses a metric tolerance for a near T and a near endpoint on a long segment', () => {
    expect(
      segmentIntersection(p(0, 0), p(4, 0), p(2, 3), p(2, 0.0000005)),
    ).toEqual(p(2, 0))
    expect(
      segmentIntersection(p(0, 0), p(4, 0), p(2, 3), p(2, 0.000002)),
    ).toBeNull()
    expect(
      segmentIntersection(
        p(0, 0),
        p(10000, 0),
        p(10000.001, -1),
        p(10000.001, 1),
      ),
    ).toBeNull()
  })

  it('distinguishes decimal collinear overlap from a genuine shallow crossing', () => {
    expect(
      segmentIntersection(p(0, 0), p(2.8, 1.2), p(1.4, 0.6), p(2.1, 0.9)),
    ).toBeNull()
    expect(
      segmentIntersection(p(0, 0), p(4, 0), p(0, -1e-8), p(4, 1e-8)),
    ).toEqual(p(2, 0))
  })

  it('rejects disjoint, overlapping and parallel segments; handles point segments', () => {
    expect(segmentIntersection(p(0, 0), p(4, 0), p(5, -1), p(5, 1))).toBeNull()
    expect(segmentIntersection(p(0, 0), p(4, 0), p(1, 0), p(3, 0))).toBeNull()
    expect(segmentIntersection(p(0, 0), p(4, 0), p(0, 1), p(4, 1))).toBeNull()
    expect(segmentIntersection(p(2, 0), p(2, 0), p(0, 0), p(4, 0))).toEqual(
      p(2, 0),
    )
    expect(segmentIntersection(p(2, 1), p(2, 1), p(0, 0), p(4, 0))).toBeNull()
  })
})

describe('plan polygons', () => {
  const room = [p(0, 0), p(4, 0), p(4, 3), p(2, 3), p(2, 1), p(0, 1)]

  it('returns signed area and area-weighted centroid regardless of winding', () => {
    expect(polygonArea(room)).toBe(8)
    expect(polygonArea([...room].reverse())).toBe(-8)
    expect(centroid(room)).toEqual(p(2.5, 1.25))
    expect(centroid([...room].reverse())).toEqual(p(2.5, 1.25))
  })

  it('checks a concave interior, exterior, boundary and vertex', () => {
    expect(pointInPolygon(p(3, 2), room)).toBe(true)
    expect(pointInPolygon(p(1, 2), room)).toBe(false)
    expect(pointInPolygon(p(2, 2), room)).toBe(true)
    expect(pointInPolygon(p(0, 0), room)).toBe(true)
    expect(pointInPolygon(p(3, 2), [...room, room[0]])).toBe(true)
  })

  it('handles empty and degenerate polygons', () => {
    const line = [p(0, 0), p(2, 0), p(4, 0)]
    expect(polygonArea(line)).toBe(0)
    expect(pointInPolygon(p(2, 0), line)).toBe(false)
    expect(centroid(line)).toEqual(p(2, 0))
    expect(centroid([])).toEqual(p(0, 0))
    expect(pointInPolygon(p(0, 0), [])).toBe(false)
  })

  it('treats decimal collinear points as degenerate and retains small nonzero areas', () => {
    const diagonal = [p(0.1, 0.1), p(0.2, 0.4), p(0.3, 0.7)]
    expect(polygonArea(diagonal)).toBe(0)
    expect(pointInPolygon(diagonal[0], diagonal)).toBe(false)
    expect(polygonArea([p(0, 0), p(1, 0), p(1, 1e-8)])).toBe(5e-9)
  })
})
