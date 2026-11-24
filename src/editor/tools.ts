export const tools = {
  select: { name: 'Select', icon: '↖', hint: 'Выбрать стену' },
  move: { name: 'Move', icon: '✥', hint: 'Перетащить стену за её ось' },
  wall: { name: 'Wall', icon: '╱', hint: 'Построить стену двумя кликами' },
  vertex: { name: 'Vertex', icon: '◇', hint: 'Выбрать или перетащить вершину' },
  delete: { name: 'Delete', icon: '×', hint: 'Удалить стену или вершину с её стенами' },
  measure: { name: 'Measure', icon: '↔', hint: 'Измерить расстояние между двумя точками' },
  pan: { name: 'Pan', icon: '✋', hint: 'Переместить рабочую область' },
} as const

export type Tool = keyof typeof tools
export type Selection = { kind: 'wall' | 'vertex'; id: string }
export type CameraView = 'perspective' | 'top'

export const editError = 'Операция создаёт недопустимую геометрию. Проверьте координаты и размеры.'
