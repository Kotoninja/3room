import { lazy, Suspense, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { distance, isPositive, usePlan } from './plan'
import type { Point } from './plan'
import { GeometryValidator } from './recognition/geometry'
import { LocalRecognitionProvider } from './recognition/local'
import type { RecognitionProvider } from './recognition/types'
import { useUnderlayUpload } from './recognition/useUnderlayUpload'
import './App.css'

const SceneRenderer = lazy(() => import('./Scene'))
const localRecognition = new LocalRecognitionProvider()

function App({ recognitionProvider = localRecognition as RecognitionProvider } = {}) {
  const plan = usePlan()
  const [view, setView] = useState<'2D' | '3D'>('2D')
  const [points, setPoints] = useState<Point[]>([])
  const [metres, setMetres] = useState('')
  const [thickness, setThickness] = useState('0.2')
  const [height, setHeight] = useState('')
  const [selectedWall, selectWall] = useState<string | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const upload = useUnderlayUpload(recognitionProvider, () => {
    setView('2D')
    setPoints([])
    setMetres('')
    setHeight('')
    setThickness('0.2')
    selectWall(null)
    setMoving(null)
    setError('')
  })
  const { rooms, issues } = useMemo(
    () => GeometryValidator({ walls: plan.walls, vertices: plan.vertices }),
    [plan.walls, plan.vertices],
  )
  const scale = plan.metresPerPixel ?? 1
  const wall = plan.walls.find(({ id }) => id === selectedWall)
  const canView3D = Boolean(plan.metresPerPixel && plan.wallHeight && plan.walls.length)
  const waitingForFirstGraph = upload.busy && !upload.pendingUnderlay && !plan.walls.length

  function pickPoint(event: MouseEvent<SVGSVGElement>) {
    if (waitingForFirstGraph) return
    const matrix = event.currentTarget.getScreenCTM()
    if (!matrix) return
    const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    let point = { x, y }
    if (moving || (plan.metresPerPixel && !wall)) {
      let nearest = 8
      for (const vertex of Object.values(plan.vertices)) {
        const candidate = { x: vertex.x / scale, y: vertex.y / scale }
        const screen = new DOMPoint(candidate.x, candidate.y).matrixTransform(matrix)
        const gap = Math.hypot(screen.x - event.clientX, screen.y - event.clientY)
        if (gap < nearest) {
          nearest = gap
          point = candidate
        }
      }
    }
    setError('')
    if (moving) {
      if (plan.moveVertex(moving, point)) setMoving(null)
      else setError('Выберите точку, которая не обнулит и не продублирует стену.')
    } else if (!plan.metresPerPixel) {
      setPoints(points.length === 2 ? [point] : [...points, point])
    } else if (wall) {
      selectWall(null)
      setThickness('0.2')
    } else if (!points.length) {
      setPoints([point])
    } else if (plan.addWall(points[0], point, Number(thickness))) {
      setPoints([])
    } else {
      setError('Выберите другие точки и проверьте толщину стены.')
    }
  }

  function calibrate(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (points.length !== 2 || !plan.calibrate(points[0], points[1], Number(metres))) {
      setError('Выберите две разные точки и введите положительное расстояние.')
      return
    }
    if (wall) setThickness(String(usePlan.getState().walls.find(item => item.id === wall.id)!.thickness))
    setError('')
    setPoints([])
  }

  const step = moving ? 'Отметьте новое положение вершины.'
    : !plan.metresPerPixel ? 'Предварительная геометрия в пикселях. Отметьте две точки для калибровки.'
      : wall ? 'Выберите, что изменить в стене.'
        : points.length ? 'Отметьте конец стены.' : 'Отметьте начало стены или выберите стену в списке.'

  return (
    <div className="editor">
      <header className="flex items-center justify-between gap-4">
        <h1>3room</h1>
        <div className="view-toggle" aria-label="Вид модели">
          <button type="button" aria-pressed={view === '2D'} onClick={() => setView('2D')}>2D</button>
          <button type="button" aria-pressed={view === '3D'} disabled={!canView3D} onClick={() => setView('3D')}>3D</button>
        </div>
      </header>
      <main className="workspace">
        <aside aria-label="Редактор плана">
          <h2>План этажа</h2>
          <label>Подложка плана
            <input type="file" accept="image/png,image/jpeg" onChange={event => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) {
                setError('')
                void upload.load(file)
              }
            }} />
          </label>
          {upload.busy && <p role="status">Локальное распознавание…</p>}
          {((upload.busy && upload.canCancel) || upload.pendingUnderlay) && (
            <button onClick={upload.useManually}>Продолжить вручную</button>
          )}
          {upload.error && <p role="alert">{upload.error}</p>}
          {plan.underlay && (
            <fieldset disabled={waitingForFirstGraph}>
              {!plan.metresPerPixel && (
                <form onSubmit={calibrate}>
                  <label>Расстояние, м
                    <input type="number" step="any" value={metres} onChange={event => setMetres(event.target.value)} />
                  </label>
                  <button className="primary" disabled={points.length !== 2}>Задать масштаб</button>
                </form>
              )}
              {plan.metresPerPixel && (
                <>
                  <label>Высота стен, м
                    <input type="number" step="any" value={height} onChange={event => {
                      setHeight(event.target.value)
                      plan.setWallHeight(Number(event.target.value))
                    }} onBlur={() => {
                      if (!isPositive(Number(height))) setHeight(plan.wallHeight === null ? '' : String(plan.wallHeight))
                    }} />
                  </label>
                  <label>Толщина стены, м
                    <input type="number" step="any" value={thickness} onChange={event => {
                      setThickness(event.target.value)
                      if (wall) plan.setWallThickness(wall.id, Number(event.target.value))
                    }} onBlur={() => {
                      if (!isPositive(Number(thickness))) setThickness(String(wall?.thickness ?? 0.2))
                    }} />
                  </label>
                  {view === '2D' && <button aria-pressed={!wall} onClick={() => {
                    selectWall(null)
                    setMoving(null)
                    setPoints([])
                    setThickness('0.2')
                  }}>Добавить стену</button>}
                </>
              )}
              {plan.walls.length > 0 && <p>Замкнутые помещения: {rooms.length}</p>}
              {view === '2D' && (issues.length > 0 || plan.rejected.length > 0) && (
                <p>Проверьте отмеченные разрывы, пересечения и отброшенные участки.</p>
              )}
              {view === '2D' && plan.openings.length > 0 && <p>Пунктиром показаны предложения дверей и окон.</p>}
              {upload.timing && <p className="timing">Инференс {Math.round(upload.timing.inferenceMs)} мс · векторизация {Math.round(upload.timing.vectorizationMs)} мс · {upload.timing.width} × {upload.timing.height} px</p>}
              {plan.walls.map((item, index) => {
                const unit = plan.metresPerPixel ? 'м' : 'px'
                return (
                  <button className="wall-row" type="button" key={item.id} aria-pressed={selectedWall === item.id} onClick={() => {
                    selectWall(item.id)
                    setMoving(null)
                    setPoints([])
                    setThickness(String(item.thickness))
                  }}>
                    Стена {index + 1} · {distance(plan.vertices[item.startId], plan.vertices[item.endId]).toFixed(2)} {unit} · толщина {item.thickness.toFixed(2)} {unit}
                  </button>
                )
              })}
              {wall && view === '2D' && <div className="wall-actions">
                <button aria-pressed={moving === wall.startId} onClick={() => { setPoints([]); setMoving(wall.startId) }}>Переместить начало</button>
                <button aria-pressed={moving === wall.endId} onClick={() => { setPoints([]); setMoving(wall.endId) }}>Переместить конец</button>
                <button onClick={() => { plan.removeWall(wall.id); selectWall(null); setMoving(null); setThickness('0.2') }}>Удалить стену</button>
              </div>}
            </fieldset>
          )}
          {view === '2D' && !upload.busy && <p role="status">{plan.underlay ? step : 'Загрузите план помещения.'}</p>}
          {error && <p role="alert">{error}</p>}
        </aside>
        <div className="viewport">
          {view === '3D' && canView3D ? (
            <Suspense fallback={<p role="status">Загрузка 3D…</p>}><SceneRenderer rooms={rooms} /></Suspense>
          ) : plan.underlay ? (
            <svg role="img" aria-label="План этажа в 2D" className="plan" data-drawing={!waitingForFirstGraph} viewBox={`0 0 ${plan.underlay.width} ${plan.underlay.height}`} onClick={pickPoint}>
              <image href={plan.underlay.url} width={plan.underlay.width} height={plan.underlay.height} />
              {rooms.map(room => <polygon key={room.id} fill="#42a68836" points={room.vertexIds.map(id => {
                const point = plan.vertices[id]
                return `${point.x / scale},${point.y / scale}`
              }).join(' ')} />)}
              {plan.walls.map(item => {
                const a = plan.vertices[item.startId]
                const b = plan.vertices[item.endId]
                return <line key={item.id} x1={a.x / scale} y1={a.y / scale} x2={b.x / scale} y2={b.y / scale}
                  stroke={selectedWall === item.id ? '#124f8a' : plan.metresPerPixel ? '#147052' : '#ac6b16'}
                  opacity={plan.metresPerPixel ? 1 : 0.65} strokeWidth={item.thickness / scale} />
              })}
              {plan.openings.map((opening, index) => <polygon key={index} fill="none" stroke={opening.kind === 'door' ? '#ab4a15' : '#164fbc'} strokeWidth={2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke"
                points={opening.polygon.map(({ x, y }) => `${x},${y}`).join(' ')} />)}
              {[...issues.map(({ x, y }) => ({ x: x / scale, y: y / scale })), ...plan.rejected].map((point, index) =>
                <circle key={index} cx={point.x} cy={point.y} r={plan.underlay!.width / 130} fill="#ffa827" stroke="#774600" vectorEffect="non-scaling-stroke" />)}
              {points.length === 2 && <line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} stroke="#147052" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
              {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={plan.underlay!.width / 140} fill="#fff" stroke="#147052" strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
              {wall && [wall.startId, wall.endId].map(id => <circle key={id}
                cx={plan.vertices[id].x / scale} cy={plan.vertices[id].y / scale}
                r={plan.underlay!.width / 140} fill={id === moving ? '#164fbc' : '#fff'} stroke="#164fbc" strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
            </svg>
          ) : <p className="empty">Подложка плана появится здесь после загрузки.</p>}
        </div>
      </main>
    </div>
  )
}

export default App
