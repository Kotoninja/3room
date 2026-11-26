import type { Opening, OpeningKind, PlanSettings } from './types'

export const MIN_WALL_LENGTH = 0.05

export const DEFAULT_PLAN_SETTINGS: Readonly<PlanSettings> = {
  defaultWallThickness: 0.2,
  defaultWallHeight: 2.7,
  gridStep: 0.1,
  snapEnabled: true,
}

type OpeningDimensions = Pick<Opening, 'width' | 'height' | 'sillHeight'>

export const DEFAULT_OPENING_DIMENSIONS = {
  door: { width: 0.9, height: 2.1, sillHeight: 0 },
  window: { width: 1.2, height: 1.2, sillHeight: 0.9 },
} as const satisfies Record<OpeningKind, OpeningDimensions>
