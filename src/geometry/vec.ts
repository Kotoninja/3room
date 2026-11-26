import type { Vec2 } from '../model/types'

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (v: Vec2, k: number): Vec2 => ({ x: v.x * k, y: v.y * k })
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x
export const len = (v: Vec2): number => Math.hypot(v.x, v.y)
export const dist = (a: Vec2, b: Vec2): number => len(sub(a, b))
export const angle = (a: Vec2, b: Vec2): number =>
  Math.atan2(b.y - a.y, b.x - a.x)

export function normalize(v: Vec2): Vec2 {
  const length = len(v)
  return length === 0 ? { x: 0, y: 0 } : { x: v.x / length, y: v.y / length }
}
