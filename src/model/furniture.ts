import { ru } from '../i18n/ru'
import type { FurnitureTypeId } from './types'

type FurnitureCatalogEntry = {
  name: string
  width: number
  depth: number
  height: number
  color: string
}

const names = ru.furniture

export const FURNITURE_CATALOG = {
  bed: { name: names.bed, width: 1.6, depth: 2, height: 0.5, color: '#8d6e63' },
  sofa: {
    name: names.sofa,
    width: 2,
    depth: 0.9,
    height: 0.8,
    color: '#5c6bc0',
  },
  table: {
    name: names.table,
    width: 1.2,
    depth: 0.8,
    height: 0.75,
    color: '#a1887f',
  },
  chair: {
    name: names.chair,
    width: 0.45,
    depth: 0.45,
    height: 0.9,
    color: '#bcaaa4',
  },
  wardrobe: {
    name: names.wardrobe,
    width: 1.2,
    depth: 0.6,
    height: 2.1,
    color: '#8d6e63',
  },
  desk: {
    name: names.desk,
    width: 1.4,
    depth: 0.7,
    height: 0.75,
    color: '#a1887f',
  },
  fridge: {
    name: names.fridge,
    width: 0.6,
    depth: 0.65,
    height: 1.8,
    color: '#cfd8dc',
  },
  kitchen: {
    name: names.kitchen,
    width: 1.2,
    depth: 0.6,
    height: 0.9,
    color: '#90a4ae',
  },
  bath: {
    name: names.bath,
    width: 1.7,
    depth: 0.7,
    height: 0.6,
    color: '#eceff1',
  },
  toilet: {
    name: names.toilet,
    width: 0.4,
    depth: 0.7,
    height: 0.4,
    color: '#eceff1',
  },
  sink: {
    name: names.sink,
    width: 0.6,
    depth: 0.5,
    height: 0.85,
    color: '#eceff1',
  },
} as const satisfies Record<FurnitureTypeId, FurnitureCatalogEntry>
