import { z } from 'zod'
import { MIN_WALL_LENGTH } from './defaults'
import { FURNITURE_TYPE_IDS, OPENING_KINDS } from './types'
import type {
  Furniture,
  Opening,
  Plan,
  PlanSettings,
  Project,
  Underlay,
  Wall,
} from './types'

const id = z.string().min(1)
const distanceTolerance = 1e-9
const Vec2Schema = z.object({ x: z.number(), y: z.number() })

function wallLength({ a, b }: Pick<Wall, 'a' | 'b'>) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

const WallFieldsSchema = z.object({
  id,
  a: Vec2Schema,
  b: Vec2Schema,
  thickness: z.number().positive(),
  height: z.number().positive(),
})

export const WallSchema = WallFieldsSchema.refine(
  (wall) => {
    const length = wallLength(wall)
    return (
      Number.isFinite(length) && length + distanceTolerance >= MIN_WALL_LENGTH
    )
  },
  { path: ['b'], message: 'Wall length must be finite and at least 0.05 m' },
) satisfies z.ZodType<Wall>

export const OpeningSchema = z.object({
  id,
  wallId: id,
  kind: z.enum(OPENING_KINDS),
  offset: z.number().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
  sillHeight: z.number().nonnegative(),
}) satisfies z.ZodType<Opening>

export const FurnitureSchema = z.object({
  id,
  type: z.enum(FURNITURE_TYPE_IDS),
  position: Vec2Schema,
  rotation: z.number(),
}) satisfies z.ZodType<Furniture>

export const PlanSettingsSchema = z.object({
  defaultWallThickness: z.number().positive(),
  defaultWallHeight: z.number().positive(),
  gridStep: z.number().positive(),
  snapEnabled: z.boolean(),
}) satisfies z.ZodType<PlanSettings>

export const PlanSchema = z
  .object({
    version: z.literal(1),
    walls: z.array(WallSchema),
    openings: z.array(OpeningSchema),
    furniture: z.array(FurnitureSchema),
    settings: PlanSettingsSchema,
  })
  .superRefine((plan, context) => {
    const collections = {
      walls: plan.walls,
      openings: plan.openings,
      furniture: plan.furniture,
    }
    for (const [name, items] of Object.entries(collections)) {
      const ids = new Set<string>()
      items.forEach((item, index) => {
        if (ids.has(item.id)) {
          context.addIssue({
            code: 'custom',
            path: [name, index, 'id'],
            message: 'Duplicate object ID',
          })
        }
        ids.add(item.id)
      })
    }

    const walls = new Map(plan.walls.map((wall) => [wall.id, wall]))
    plan.openings.forEach((opening, index) => {
      const wall = walls.get(opening.wallId)
      if (!wall) {
        context.addIssue({
          code: 'custom',
          path: ['openings', index, 'wallId'],
          message: 'Opening references a missing wall',
        })
        return
      }
      const halfWidth = opening.width / 2
      if (
        opening.offset - halfWidth < -distanceTolerance ||
        opening.offset + halfWidth > wallLength(wall) + distanceTolerance
      ) {
        context.addIssue({
          code: 'custom',
          path: ['openings', index, 'offset'],
          message: 'Opening extends beyond its wall',
        })
      }
      if (
        opening.sillHeight + opening.height >
        wall.height + distanceTolerance
      ) {
        context.addIssue({
          code: 'custom',
          path: ['openings', index, 'height'],
          message: 'Opening exceeds its wall height',
        })
      }
    })
  }) satisfies z.ZodType<Plan>

export const UnderlaySchema = z.object({
  imageId: id,
  widthPx: z.int().positive(),
  heightPx: z.int().positive(),
  metersPerPixel: z.number().nonnegative(),
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
}) satisfies z.ZodType<Underlay>

export const ProjectSchema = z
  .object({
    id,
    name: z.string().refine((name) => name.trim().length > 0, {
      message: 'Project name is required',
    }),
    createdAt: z.int().nonnegative(),
    updatedAt: z.int().nonnegative(),
    plan: PlanSchema,
    underlay: UnderlaySchema.optional(),
  })
  .refine((project) => project.updatedAt >= project.createdAt, {
    path: ['updatedAt'],
    message: 'Update time precedes creation time',
  }) satisfies z.ZodType<Project>
