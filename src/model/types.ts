export type Id = string

export interface Vec2 {
  x: number
  y: number
}

export interface Wall {
  id: Id
  a: Vec2
  b: Vec2
  thickness: number
  height: number
}

export const OPENING_KINDS = ['door', 'window'] as const
export type OpeningKind = (typeof OPENING_KINDS)[number]

export interface Opening {
  id: Id
  wallId: Id
  kind: OpeningKind
  offset: number
  width: number
  height: number
  sillHeight: number
}

export const FURNITURE_TYPE_IDS = [
  'bed',
  'sofa',
  'table',
  'chair',
  'wardrobe',
  'desk',
  'fridge',
  'kitchen',
  'bath',
  'toilet',
  'sink',
] as const
export type FurnitureTypeId = (typeof FURNITURE_TYPE_IDS)[number]

export interface Furniture {
  id: Id
  type: FurnitureTypeId
  position: Vec2
  rotation: number
}

export interface PlanSettings {
  defaultWallThickness: number
  defaultWallHeight: number
  gridStep: number
  snapEnabled: boolean
}

export interface Plan {
  version: 1
  walls: Wall[]
  openings: Opening[]
  furniture: Furniture[]
  settings: PlanSettings
}

export interface Underlay {
  imageId: string
  widthPx: number
  heightPx: number
  metersPerPixel: number
  opacity: number
  visible: boolean
}

export interface Project {
  id: Id
  name: string
  createdAt: number
  updatedAt: number
  plan: Plan
  underlay?: Underlay
}

export interface Room {
  polygon: Vec2[]
  area: number
}
