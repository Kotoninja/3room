import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { distance, isPositive, usePlan } from './plan'
import type { Point } from './plan'
import PlanCanvas from './editor/PlanCanvas'
import Properties, { NumberField } from './editor/Properties'
import { editError, tools } from './editor/tools'
import type { CameraView, Selection, Tool } from './editor/tools'
import { GeometryValidator } from './recognition/geometry'
import { LocalRecognitionProvider } from './recognition/local'
import type { RecognitionProvider } from './recognition/types'
import { useUnderlayUpload } from './recognition/useUnderlayUpload'
import './App.css'

const SceneRenderer = lazy(() => import('./Scene'))
const localRecognition: RecognitionProvider = new LocalRecognitionProvider()

function App({ recognitionProvider = localRecognition } = {}) {
  const plan = usePlan()
  const [requestedView, setView] = useState<'2D' | '3D'>('2D')
  const [tool, setTool] = useState<Tool>('select')
  const [selection, select] = useState<Selection | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [calibrating, setCalibrating] = useState(true)
  const [metres, setMetres] = useState('')
  const [newThickness, setNewThickness] = useState(0.2)
  const [moving, setMoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [grid, setGrid] = useState(true)
  const [snapGrid, setSnapGrid] = useState(false)
  const [snapVertices, setSnapVertices] = useState(true)
  const [gridStep, setGridStep] = useState(0.5)
  const [pixelStep, setPixelStep] = useState(25)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [zoom, setZoom] = useState(1)
  const [camera, setCamera] = useState<CameraView>('perspective')
  const [resetView, setResetView] = useState(0)

  const chooseTool = useCallback((next: Tool) => {
    setTool(next)
    setCalibrating(false)
    setPoints([])
    setMoving(null)
    setError('')
  }, [])

  const upload = useUnderlayUpload(recognitionProvider, () => {
    setView('2D')
    chooseTool('select')
    setCalibrating(true)
    select(null)
    setMetres('')
    setCursor(null)
    setResetView(value => value + 1)
  })

  const { rooms, issues } = useMemo(
    () => GeometryValidator({ walls: plan.walls, vertices: plan.vertices }),
    [plan.walls, plan.vertices],
  )
  const scale = plan.metresPerPixel ?? 1
  const unit = plan.metresPerPixel ? 'м' : 'px'
  const active = selection && (selection.kind === 'wall'
    ? plan.walls.some(wall => wall.id === selection.id)
    : Boolean(plan.vertices[selection.id])) ? selection : null
  const wall = active?.kind === 'wall' ? plan.walls.find(({ id }) => id === active.id) : undefined
  const canView3D = Boolean(plan.metresPerPixel && plan.wallHeight && plan.walls.length)
  const view = requestedView === '3D' && canView3D ? '3D' : '2D'
  const waiting = upload.busy && !upload.pendingUnderlay && !plan.walls.length
  const activeKind = active?.kind
  const activeId = active?.id

  function report(success: boolean) {
    setError(success ? '' : editError)
    return success
  }
  function remove(target: Selection) {
    if (target.kind === 'wall') plan.removeWall(target.id)
    else plan.removeVertex(target.id)
    select(null)
    setMoving(null)
  }
  function changeView(next: '2D' | '3D') {
    setView(next)
    chooseTool('select')
  }

  const history = useCallback((action: 'undo' | 'redo') => {
    chooseTool('select')
    usePlan.getState()[action]()
    const updated = usePlan.getState()
    if (!updated.wallHeight || !updated.walls.length) setView('2D')
  }, [chooseTool])

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        chooseTool('select')
        return
      }
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        history(event.shiftKey ? 'redo' : 'undo')
      } else if (activeId && view === '2D' && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        const current = usePlan.getState()
        if (activeKind === 'wall') current.removeWall(activeId)
        else current.removeVertex(activeId)
        select(null)
        chooseTool('select')
      }
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [activeId, activeKind, chooseTool, history, view])

  function pointPicked(point: Point) {
    if (moving) {
      if (report(plan.moveVertex(moving, point))) setMoving(null)
    } else if (tool === 'measure' || !plan.metresPerPixel) {
      setPoints(points.length === 2 ? [point] : [...points, point])
    } else if (tool === 'wall') {
      if (!points.length) setPoints([point])
      else if (report(plan.addWall(points[0], point, newThickness))) setPoints([])
    }
  }

  function calibrate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (tool !== 'select' || points.length !== 2 || !plan.calibrate(points[0], points[1], Number(metres))) {
      setError('Выберите две разные точки и введите положительное расстояние.')
      return
    }
    chooseTool('wall')
  }

  const hint = moving ? 'Отметьте новое положение вершины.'
    : tool === 'measure' ? 'Отметьте две точки для измерения.'
      : !plan.metresPerPixel && tool === 'select' ? 'Предварительная геометрия в пикселях. Отметьте две точки для калибровки.'
        : tool === 'wall' && points.length ? 'Отметьте конец стены.' : tools[tool].hint

  return <div className="editor">
    <header className="editor-top">
      <h1>3room</h1>
      <div className="view-toggle" aria-label="Вид модели">
        <button aria-pressed={view === '2D'} onClick={() => changeView('2D')}>2D</button>
        <button aria-pressed={view === '3D'} disabled={!canView3D} onClick={() => changeView('3D')}>3D</button>
      </div>
      <div className="view-toggle" aria-label="История">
        <button disabled={!plan.canUndo} title="Cmd+Z" onClick={() => history('undo')}>↶ Undo</button>
        <button disabled={!plan.canRedo} title="Cmd+Shift+Z" onClick={() => history('redo')}>↷ Redo</button>
      </div>
      <div className="view-toggle" aria-label="Отображение">
        <button aria-pressed={grid} onClick={() => setGrid(!grid)}>Сетка</button>
        <button title="Сбросить масштаб и положение вида" onClick={() => setResetView(value => value + 1)}>Сброс вида</button>
        {view === '3D' && <>
          <button aria-pressed={camera === 'top'} onClick={() => { setCamera('top'); setResetView(value => value + 1) }}>Вид сверху</button>
          <button aria-pressed={camera === 'perspective'} onClick={() => { setCamera('perspective'); setResetView(value => value + 1) }}>Перспектива</button>
        </>}
      </div>
    </header>
    <main className="workspace">
      <aside className="workspace-tools" aria-label="Инструменты и подложка">
        <nav aria-label="Инструменты редактора" className="tool-list">
          {(Object.keys(tools) as Tool[]).map(id => <button key={id} title={tools[id].hint}
            aria-pressed={tool === id} disabled={!plan.underlay || waiting ||
              (view === '3D' && id !== 'select' && id !== 'pan') || (id === 'wall' && !plan.metresPerPixel)}
            onClick={() => chooseTool(id)}>
            <span aria-hidden="true">{tools[id].icon}</span>{tools[id].name}
          </button>)}
        </nav>
        <div className="plan-setup">
          <h2>План этажа</h2>
          <label>Подложка плана
            <input type="file" accept="image/png,image/jpeg" onChange={event => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) { setError(''); void upload.load(file) }
            }} />
          </label>
          {upload.busy && <p role="status">Локальное распознавание…</p>}
          {((upload.busy && upload.canCancel) || upload.pendingUnderlay) && <button onClick={upload.useManually}>Продолжить вручную</button>}
          {upload.error && <p role="alert">{upload.error}</p>}
          {plan.underlay && <fieldset disabled={waiting}>
            {!plan.metresPerPixel && <form onSubmit={calibrate}>
              <button type="button" aria-pressed={calibrating} onClick={() => { chooseTool('select'); setCalibrating(true) }}>
                Отметить точки калибровки
              </button>
              <label>Расстояние, м
                <input type="number" step="any" value={metres} onFocus={() => { if (tool !== 'select') chooseTool('select') }}
                  onChange={event => setMetres(event.target.value)} />
              </label>
              <button className="primary" disabled={points.length !== 2 || tool !== 'select'}>Задать масштаб</button>
            </form>}
            {plan.metresPerPixel && view === '2D' && tool === 'wall' && <NumberField label="Толщина стены, м" value={newThickness}
              change={value => { if (!report(isPositive(value))) return false; setNewThickness(value); return true }} />}
            {plan.metresPerPixel && !wall && <NumberField label="Высота стен, м" value={plan.wallHeight} change={value => report(plan.setWallHeight(value))} />}
            <NumberField label={`Шаг сетки, ${unit}`} value={plan.metresPerPixel ? gridStep : pixelStep}
              change={value => {
                if (!report(isPositive(value) && (plan.metresPerPixel ? value >= 0.01 : value >= 1))) return false
                if (plan.metresPerPixel) setGridStep(value)
                else setPixelStep(value)
                return true
              }} />
            <button aria-pressed={snapGrid} onClick={() => setSnapGrid(!snapGrid)}>Привязка к сетке</button>
            <button aria-pressed={snapVertices} onClick={() => setSnapVertices(!snapVertices)}>Привязка к вершинам</button>
          </fieldset>}
        </div>
      </aside>
      <div className="viewport">
        {view === '3D' && canView3D
          ? <Suspense fallback={<p role="status">Загрузка 3D…</p>}><SceneRenderer rooms={rooms} selection={active}
              select={select} cameraView={camera} resetView={resetView} grid={grid} gridStep={gridStep} pan={tool === 'pan'} /></Suspense>
          : plan.underlay
            ? <PlanCanvas key={resetView} tool={tool} selection={active} select={select} points={points} calibrating={calibrating}
                rooms={rooms} issues={issues} grid={grid} snapGrid={snapGrid} snapVertices={snapVertices}
                gridStep={plan.metresPerPixel ? gridStep : pixelStep} locked={waiting} moving={moving}
                onPoint={pointPicked} onRemove={remove} report={report} onCursor={setCursor}
                onZoom={setZoom} />
            : <p className="empty">Подложка плана появится здесь после загрузки.</p>}
        <div className="workspace-note">
          {view === '2D' && plan.underlay && !upload.busy && <p role="status">{hint}</p>}
          {tool === 'measure' && points.length === 2 && <output>Расстояние: {(distance(points[0], points[1]) * scale).toFixed(2)} {unit}</output>}
          {plan.walls.length > 0 && <p>Замкнутые помещения: {rooms.length}</p>}
          {view === '2D' && (issues.length > 0 || plan.rejected.length > 0) && <p>Проверьте отмеченные разрывы, пересечения и отброшенные участки.</p>}
          {view === '2D' && plan.openings.length > 0 && <p>Пунктиром показаны предложения дверей и окон.</p>}
          {upload.timing && <p className="timing">Инференс {Math.round(upload.timing.inferenceMs)} мс · векторизация {Math.round(upload.timing.vectorizationMs)} мс · {upload.timing.width} × {upload.timing.height} px</p>}
          {error && <p role="alert">{error}</p>}
        </div>
      </div>
      <div className="property-column">
        <Properties selection={active} report={report} editing={view === '2D'}
          moveEndpoint={id => { chooseTool('vertex'); setMoving(id) }} remove={() => { if (active) remove(active) }} />
        {plan.walls.length > 0 && <details className="wall-list" open>
          <summary>Стены · {plan.walls.length}</summary>
          {plan.walls.map((item, index) => <button className="wall-row" key={item.id}
            aria-pressed={active?.kind === 'wall' && active.id === item.id} onClick={() => {
              chooseTool('select')
              select({ kind: 'wall', id: item.id })
            }}>
            Стена {index + 1} · {distance(plan.vertices[item.startId], plan.vertices[item.endId]).toFixed(2)} {unit} · толщина {item.thickness.toFixed(2)} {unit}
          </button>)}
        </details>}
      </div>
    </main>
    <footer className="editor-status">
      <span>{plan.metresPerPixel ? `Масштаб ${plan.metresPerPixel.toPrecision(4)} м/px` : 'Масштаб не задан'}</span>
      {view === '2D' && <span>Вид {Math.round(zoom * 100)}%</span>}
      {view === '2D' && cursor && <span>X {(cursor.x * scale).toFixed(2)} · Y {(cursor.y * scale).toFixed(2)} {unit}</span>}
      <span>{tools[tool].name}</span>
    </footer>
  </div>
}

export default App
