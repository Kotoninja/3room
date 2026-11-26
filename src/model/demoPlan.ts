import { DEFAULT_OPENING_DIMENSIONS, DEFAULT_PLAN_SETTINGS } from './defaults'
import type { Opening, OpeningKind, Plan, Vec2, Wall } from './types'

function wall(id: string, a: Vec2, b: Vec2): Wall {
  return {
    id,
    a,
    b,
    thickness: DEFAULT_PLAN_SETTINGS.defaultWallThickness,
    height: DEFAULT_PLAN_SETTINGS.defaultWallHeight,
  }
}

function opening(
  id: string,
  wallId: string,
  kind: OpeningKind,
  offset: number,
): Opening {
  return { id, wallId, kind, offset, ...DEFAULT_OPENING_DIMENSIONS[kind] }
}

export const demoPlan: Plan = {
  version: 1,
  walls: [
    wall('north-west', { x: 0, y: 0 }, { x: 4, y: 0 }),
    wall('north-east', { x: 4, y: 0 }, { x: 9, y: 0 }),
    wall('east', { x: 9, y: 0 }, { x: 9, y: 4 }),
    wall('south-east', { x: 9, y: 4 }, { x: 4, y: 4 }),
    wall('south-west', { x: 4, y: 4 }, { x: 0, y: 4 }),
    wall('west', { x: 0, y: 4 }, { x: 0, y: 0 }),
    wall('partition', { x: 4, y: 0 }, { x: 4, y: 4 }),
  ],
  openings: [
    opening('front-door', 'south-west', 'door', 1),
    opening('inside-door', 'partition', 'door', 3),
    opening('west-window', 'north-west', 'window', 2),
    opening('east-window', 'north-east', 'window', 2.5),
  ],
  furniture: [
    { id: 'demo-sofa', type: 'sofa', position: { x: 1.3, y: 1 }, rotation: 0 },
    {
      id: 'demo-table',
      type: 'table',
      position: { x: 2, y: 2.3 },
      rotation: 0,
    },
    { id: 'demo-bed', type: 'bed', position: { x: 7.8, y: 1.5 }, rotation: 0 },
    {
      id: 'demo-desk',
      type: 'desk',
      position: { x: 5.1, y: 0.9 },
      rotation: 0,
    },
  ],
  settings: { ...DEFAULT_PLAN_SETTINGS },
}
