import { useState } from 'react'
import { distance, usePlan } from '../plan'
import type { Selection } from './tools'

export function NumberField({ label, value, change }: {
  label: string; value: number | null; change: (value: number) => boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label>{label}
      <input type="number" step="any" value={draft ?? (value === null ? '' : Number(value.toPrecision(12)))}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) change(draft.trim() === '' ? NaN : Number(draft))
          setDraft(null)
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') setDraft(null)
        }} />
    </label>
  )
}

export default function Properties({ selection, report, moveEndpoint, remove, editing }: {
  selection: Selection | null
  report: (success: boolean) => boolean
  moveEndpoint: (id: string) => void
  remove: () => void
  editing: boolean
}) {
  const plan = usePlan()
  const scale = plan.metresPerPixel ?? 1
  const unit = plan.metresPerPixel ? 'м' : 'px'
  const wall = selection?.kind === 'wall' ? plan.walls.find(item => item.id === selection.id) : undefined
  function coordinates(id: string, label: string) {
    const point = plan.vertices[id]
    return <fieldset className="coordinate-fields"><legend>{label}</legend>
      {(['x', 'y'] as const).map(axis => (
        <NumberField key={id + axis} label={`${axis.toUpperCase()}, ${unit}`} value={point[axis]}
          change={value => report(plan.moveVertex(id, { x: point.x / scale, y: point.y / scale, [axis]: value / scale }))} />
      ))}
    </fieldset>
  }

  return <aside className="properties" aria-label="Свойства объекта">
    <h2>Свойства</h2>
    {wall ? <div key={wall.id}>
      <p className="object-id">ID стены <code>{wall.id}</code></p>
      <NumberField label={`Длина стены, ${unit}`} value={distance(plan.vertices[wall.startId], plan.vertices[wall.endId])}
        change={value => report(plan.resizeWall(wall.id, value))} />
      <NumberField label={`Толщина стены, ${unit}`} value={wall.thickness}
        change={value => report(plan.setWallThickness(wall.id, value))} />
      {plan.metresPerPixel
        ? <NumberField label="Высота стен, м" value={plan.wallHeight} change={value => report(plan.setWallHeight(value))} />
        : <p>Высота доступна после калибровки.</p>}
      {coordinates(wall.startId, 'Начало')}
      {coordinates(wall.endId, 'Конец')}
      {editing && <div className="wall-actions">
        <button onClick={() => moveEndpoint(wall.startId)}>Переместить начало</button>
        <button onClick={() => moveEndpoint(wall.endId)}>Переместить конец</button>
        <button onClick={remove}>Удалить стену</button>
      </div>}
    </div> : selection?.kind === 'vertex' && plan.vertices[selection.id] ? <div key={selection.id}>
      <p className="object-id">ID вершины <code>{selection.id}</code></p>
      {coordinates(selection.id, 'Координаты вершины')}
      {editing && <button onClick={remove}>Удалить вершину и её стены</button>}
    </div> : <p>Выберите стену или вершину.</p>}
  </aside>
}
