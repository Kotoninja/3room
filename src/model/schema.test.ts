import { describe, expect, it } from 'vitest'
import { demoPlan } from './demoPlan'
import { FURNITURE_CATALOG } from './furniture'
import { PlanSchema, ProjectSchema } from './schema'
import type { Project } from './types'

const project: Project = {
  id: 'demo-project',
  name: 'Demo',
  createdAt: 1,
  updatedAt: 2,
  plan: demoPlan,
  underlay: {
    imageId: 'image-1',
    widthPx: 1600,
    heightPx: 900,
    metersPerPixel: 0.01,
    opacity: 0.5,
    visible: true,
  },
}

describe('stored RoomForge plans', () => {
  it('round-trips the demo through JSON and validates a project with a calibrated underlay', () => {
    const plan = PlanSchema.parse(JSON.parse(JSON.stringify(demoPlan)))
    expect(plan).toEqual(demoPlan)
    expect(ProjectSchema.parse(project)).toEqual(project)
    expect(
      ProjectSchema.safeParse({ ...project, underlay: undefined }).success,
    ).toBe(true)
    expect(plan.walls).toHaveLength(7)
    expect(
      plan.openings.filter((opening) => opening.kind === 'door'),
    ).toHaveLength(2)
    expect(
      plan.openings.filter((opening) => opening.kind === 'window'),
    ).toHaveLength(2)
    expect(plan.furniture).toHaveLength(4)
    expect(plan.settings).toEqual({
      defaultWallThickness: 0.2,
      defaultWallHeight: 2.7,
      gridStep: 0.1,
      snapEnabled: true,
    })
  })

  it('provides the eleven furniture types and their specified dimensions', () => {
    expect(
      Object.fromEntries(
        Object.entries(FURNITURE_CATALOG).map(
          ([id, { width, depth, height }]) => [id, [width, depth, height]],
        ),
      ),
    ).toEqual({
      bed: [1.6, 2, 0.5],
      sofa: [2, 0.9, 0.8],
      table: [1.2, 0.8, 0.75],
      chair: [0.45, 0.45, 0.9],
      wardrobe: [1.2, 0.6, 2.1],
      desk: [1.4, 0.7, 0.75],
      fridge: [0.6, 0.65, 1.8],
      kitchen: [1.2, 0.6, 0.9],
      bath: [1.7, 0.7, 0.6],
      toilet: [0.4, 0.7, 0.4],
      sink: [0.6, 0.5, 0.85],
    })
  })

  it('provides the specified furniture colors', () => {
    expect(
      Object.fromEntries(
        Object.entries(FURNITURE_CATALOG).map(([id, entry]) => [
          id,
          entry.color,
        ]),
      ),
    ).toEqual({
      bed: '#8d6e63',
      sofa: '#5c6bc0',
      table: '#a1887f',
      chair: '#bcaaa4',
      wardrobe: '#8d6e63',
      desk: '#a1887f',
      fridge: '#cfd8dc',
      kitchen: '#90a4ae',
      bath: '#eceff1',
      toilet: '#eceff1',
      sink: '#eceff1',
    })
  })

  it('preserves an uploaded underlay before calibration', () => {
    const uncalibrated = {
      ...project,
      underlay: { ...project.underlay!, metersPerPixel: 0 },
    }
    expect(ProjectSchema.parse(uncalibrated)).toEqual(uncalibrated)
  })

  it.each([
    ['unknown version', { ...demoPlan, version: 2 }],
    [
      'missing host wall',
      {
        ...demoPlan,
        openings: [{ ...demoPlan.openings[0], wallId: 'missing' }],
      },
    ],
    [
      'non-finite coordinate',
      {
        ...demoPlan,
        walls: [{ ...demoPlan.walls[0], a: { x: Infinity, y: 0 } }],
      },
    ],
    [
      'short wall',
      {
        ...demoPlan,
        openings: [],
        walls: [
          { ...demoPlan.walls[0], a: { x: 0, y: 0 }, b: { x: 0.04, y: 0 } },
        ],
      },
    ],
    [
      'duplicate wall ID',
      { ...demoPlan, walls: [...demoPlan.walls, demoPlan.walls[0]] },
    ],
    [
      'opening below the start of the wall',
      { ...demoPlan, openings: [{ ...demoPlan.openings[0], offset: 0.1 }] },
    ],
    [
      'opening above the wall',
      { ...demoPlan, openings: [{ ...demoPlan.openings[0], height: 3 }] },
    ],
    [
      'unknown furniture',
      { ...demoPlan, furniture: [{ ...demoPlan.furniture[0], type: 'other' }] },
    ],
    [
      'invalid grid',
      { ...demoPlan, settings: { ...demoPlan.settings, gridStep: 0 } },
    ],
  ])('rejects %s', (_label, data) => {
    expect(PlanSchema.safeParse(data).success).toBe(false)
  })

  it('rejects invalid project metadata and underlay settings', () => {
    expect(ProjectSchema.safeParse({ ...project, name: ' ' }).success).toBe(
      false,
    )
    expect(ProjectSchema.safeParse({ ...project, updatedAt: 0 }).success).toBe(
      false,
    )
    expect(
      ProjectSchema.safeParse({
        ...project,
        underlay: { ...project.underlay, metersPerPixel: -1, opacity: 2 },
      }).success,
    ).toBe(false)
  })
})
