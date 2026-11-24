import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import { distance, usePlan } from '../plan'
import type { Point } from '../plan'
import type { Selection, Tool } from './tools'

type Room = { id: string; vertexIds: string[] }
type Gesture = { id: number; start: Point; cursor: Point; selection: Selection | null; origin: Point; moved: boolean }

type Props = {
  tool: Tool
  selection: Selection | null
  select: (selection: Selection | null) => void
  points: Point[]
  calibrating: boolean
  rooms: Room[]
  issues: Point[]
  grid: boolean
  snapGrid: boolean
  snapVertices: boolean
  gridStep: number
  locked: boolean
  moving: string | null
  onPoint: (point: Point) => void
  onRemove: (selection: Selection) => void
  report: (success: boolean) => boolean
  onCursor: (point: Point) => void
  onZoom: (zoom: number) => void
}

function hitTarget(target: EventTarget | null) {
  const node = target instanceof Element ? target.closest('[data-wall],[data-vertex]') : null
  const wall = node?.getAttribute('data-wall')
  const vertex = node?.getAttribute('data-vertex')
  if (vertex) return { kind: 'vertex', id: vertex } as const
  if (wall) return { kind: 'wall', id: wall } as const
  return null
}

export default function PlanCanvas(props: Props) {
  const plan = usePlan()
  const svg = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [preview, setPreview] = useState<Gesture | null>(null)
  const { width, height, url } = plan.underlay!
  const scale = plan.metresPerPixel ?? 1
  const step = props.gridStep / scale
  const px = (point: Point) => ({ x: point.x / scale, y: point.y / scale })
  const format = (point: Point) => `${point.x},${point.y}`
  const unit = plan.metresPerPixel ? 'м' : 'px'

  const { tool, moving, onZoom } = props
  const [dragMode, setDragMode] = useState({ tool, moving })
  if (dragMode.tool !== tool || dragMode.moving !== moving) {
    setDragMode({ tool, moving })
    setPreview(null)
  }
  useEffect(() => { gesture.current = null }, [tool, moving])
  useEffect(() => onZoom(zoom), [onZoom, zoom])

  useEffect(() => {
    const node = svg.current!
    const wheel = (event: WheelEvent) => {
      const matrix = node.getScreenCTM()
      if (!matrix) return
      event.preventDefault()
      const next = Math.min(12, Math.max(0.2, zoom * Math.exp(-event.deltaY * 0.002)))
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      setZoom(next)
      setPan({ x: point.x - (point.x - pan.x) * zoom / next, y: point.y - (point.y - pan.y) * zoom / next })
    }
    node.addEventListener('wheel', wheel, { passive: false })
    return () => node.removeEventListener('wheel', wheel)
  }, [pan, zoom])

  function snapVertex(point: Point, matrix: DOMMatrix, skip: string[]) {
    if (!props.snapVertices) return null
    const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix)
    let nearest = 8
    let result: { point: Point; gap: number } | null = null
    for (const [id, position] of Object.entries(plan.vertices)) {
      if (skip.includes(id)) continue
      const candidate = px(position)
      const gap = distance(new DOMPoint(candidate.x, candidate.y).matrixTransform(matrix), screen)
      if (gap < nearest) {
        nearest = gap
        result = { point: candidate, gap }
      }
    }
    return result
  }

  function snapToGrid(point: Point) {
    if (!props.snapGrid || !Number.isFinite(step) || step <= 0) return point
    return { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step }
  }

  function locate(event: MouseEvent<SVGSVGElement>, snap = false, skip: string[] = []) {
    const matrix = event.currentTarget.getScreenCTM()!
    const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    const point = { x, y }
    return snap ? snapVertex(point, matrix, skip)?.point ?? snapToGrid(point) : point
  }

  function translation(event: PointerEvent<SVGSVGElement>, active: Gesture): Point {
    const raw = locate(event)
    const offset = { x: raw.x - active.start.x, y: raw.y - active.start.y }
    const selected = active.selection!
    const wall = selected.kind === 'wall' ? plan.walls.find(({ id }) => id === selected.id) : undefined
    const ids = wall ? [wall.startId, wall.endId] : [selected.id]
    const matrix = event.currentTarget.getScreenCTM()!
    const candidates = ids.map(id => {
      const origin = px(plan.vertices[id])
      const target = { x: origin.x + offset.x, y: origin.y + offset.y }
      return { origin, target, snap: snapVertex(target, matrix, ids) }
    })
    const best = candidates.filter(item => item.snap).sort((a, b) => a.snap!.gap - b.snap!.gap)[0] ?? candidates[0]
    const target = best.snap?.point ?? snapToGrid(best.target)
    return { x: target.x - best.origin.x, y: target.y - best.origin.y }
  }

  function start(event: PointerEvent<SVGSVGElement>) {
    if (props.locked || gesture.current || !event.isPrimary || event.button !== 0) return
    suppressClick.current = false
    const selected = hitTarget(event.target)
    const draggable = (props.tool === 'move' && selected?.kind === 'wall') || (props.tool === 'vertex' && selected?.kind === 'vertex')
    if (!draggable && props.tool !== 'pan') return
    if (draggable) props.select(selected)
    const point = locate(event)
    gesture.current = {
      id: event.pointerId, start: point, cursor: { x: event.clientX, y: event.clientY },
      selection: draggable ? selected : null, origin: draggable && selected?.kind === 'vertex' ? px(plan.vertices[selected.id]) : pan, moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    if (!event.currentTarget.getScreenCTM()) return
    props.onCursor(locate(event))
    const active = gesture.current
    if (!active || active.id !== event.pointerId) return
    const delta = { x: event.clientX - active.cursor.x, y: event.clientY - active.cursor.y }
    if (!active.moved && Math.hypot(delta.x, delta.y) < 3) return
    active.moved = true
    if (active.selection) {
      setPreview({ ...active, cursor: translation(event, active) })
    } else {
      const matrix = event.currentTarget.getScreenCTM()!
      setPan({ x: active.origin.x - delta.x / matrix.a, y: active.origin.y - delta.y / matrix.d })
    }
  }

  function finish(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current
    if (!active || active.id !== event.pointerId) return
    gesture.current = null
    setPreview(null)
    if (!active.moved || event.type === 'pointercancel') return
    suppressClick.current = true
    const selected = active.selection
    if (!selected) return
    const delta = translation(event, active)
    if (selected.kind === 'wall') props.report(plan.moveWall(selected.id, delta))
    else if (props.report(plan.moveVertex(selected.id, { x: active.origin.x + delta.x, y: active.origin.y + delta.y }))) {
      const target = { x: (active.origin.x + delta.x) * scale, y: (active.origin.y + delta.y) * scale }
      const id = Object.entries(usePlan.getState().vertices).find(([, point]) => distance(point, target) < 1e-8)?.[0]
      props.select(id ? { kind: 'vertex', id } : null)
    }
  }

  function click(event: MouseEvent<SVGSVGElement>) {
    if (suppressClick.current || props.locked) return
    const target = hitTarget(event.target)
    if (props.moving || props.tool === 'wall' || props.tool === 'measure') {
      props.onPoint(locate(event, props.tool === 'wall' || Boolean(props.moving), props.moving ? [props.moving] : []))
    } else if (props.tool === 'delete' && target) props.onRemove(target)
    else if (props.tool === 'select') {
      if (!plan.metresPerPixel && (props.calibrating || !target)) props.onPoint(locate(event))
      else props.select(target)
    }
  }

  const activeWall = preview?.selection?.kind === 'wall' ? plan.walls.find(({ id }) => id === preview.selection?.id) : null
  const movingIds = activeWall ? [activeWall.startId, activeWall.endId] : [preview?.selection?.id]
  function display(id: string) {
    const point = px(plan.vertices[id])
    return preview && movingIds.includes(id) ? { x: point.x + preview.cursor.x, y: point.y + preview.cursor.y } : point
  }

  return <svg ref={svg} role="img" aria-label="План этажа в 2D" className={`plan tool-${props.tool}`}
    viewBox={`${pan.x} ${pan.y} ${width / zoom} ${height / zoom}`}
    onClick={click} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={event => {
      if (gesture.current?.id === event.pointerId) { gesture.current = null; setPreview(null) }
    }}>
    <image href={url} width={width} height={height} />
    {props.grid && Number.isFinite(step) && step > 0 && <>
      <defs><pattern id="plan-grid" width={step} height={step} patternUnits="userSpaceOnUse">
        <path d={`M ${step} 0 H 0 V ${step}`} fill="none" stroke="#167d79" opacity=".32" vectorEffect="non-scaling-stroke" />
      </pattern></defs>
      <rect x={pan.x} y={pan.y} width={width / zoom} height={height / zoom} fill="url(#plan-grid)" pointerEvents="none" />
    </>}
    {props.rooms.map(room => <polygon key={room.id} fill="#42a68836" points={room.vertexIds.map(id => format(display(id))).join(' ')} />)}
    {plan.walls.map((wall, index) => {
      const a = display(wall.startId)
      const b = display(wall.endId)
      const selected = props.selection?.kind === 'wall' && props.selection.id === wall.id
      return <g key={wall.id} data-wall={wall.id}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={selected ? '#124f8a' : plan.metresPerPixel ? '#147052' : '#ac6b16'}
          opacity={plan.metresPerPixel ? 1 : 0.65} strokeWidth={wall.thickness / scale} />
        <line aria-label={`Стена ${index + 1} на плане`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent"
          strokeWidth={12} vectorEffect="non-scaling-stroke" />
        {(selected || props.tool === 'measure') && <text className="wall-dimension" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2}
          dy={-width / zoom / 80} fontSize={width / zoom / 58} textAnchor="middle" pointerEvents="none">
          {(distance(a, b) * scale).toFixed(2)} {unit}
        </text>}
      </g>
    })}
    {plan.openings.map((opening, index) => <polygon key={index} fill="none" stroke={opening.kind === 'door' ? '#ab4a15' : '#164fbc'}
      strokeWidth={2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none" points={opening.polygon.map(format).join(' ')} />)}
    {[...props.issues.map(px), ...plan.rejected].map((point, index) => <circle key={index} cx={point.x} cy={point.y}
      r={width / zoom / 130} fill="#ffa827" stroke="#774600" vectorEffect="non-scaling-stroke" pointerEvents="none" />)}
    {Object.entries(plan.vertices).map(([id]) => {
      const selected = props.selection
      const wall = selected?.kind === 'wall' ? plan.walls.find(item => item.id === selected.id) : null
      const highlighted = selected?.kind === 'vertex' && selected.id === id || wall?.startId === id || wall?.endId === id
      if (!highlighted && props.tool !== 'vertex' && props.tool !== 'delete') return null
      const point = display(id)
      return <circle key={id} data-vertex={id} aria-label="Вершина на плане" cx={point.x} cy={point.y}
        r={width / zoom / 115} fill={id === props.moving || selected?.id === id ? '#164fbc' : '#fff'}
        stroke="#164fbc" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    })}
    {props.points.length === 2 && <polyline points={props.points.map(format).join(' ')} fill="none" stroke="#147052"
      strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
    {props.points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={width / zoom / 140}
      fill="#fff" stroke="#147052" strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none" />)}
  </svg>
}
