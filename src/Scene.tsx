import { Grid, OrbitControls, OrthographicCamera } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { ComponentRef } from 'react'
import { Box3, DoubleSide, MOUSE, OrthographicCamera as ThreeOrthographicCamera, Shape, Vector3 } from 'three'
import { distance, usePlan } from './plan'
import type { CameraView, Selection } from './editor/tools'

function CameraControls({ cameraView, resetView, pan }: { cameraView: CameraView; resetView: number; pan: boolean }) {
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, size } = useThree()

  useEffect(() => {
    const controls = orbit.current
    if (!controls) return
    const { vertices, wallHeight } = usePlan.getState()
    const points = Object.values(vertices)
    if (!points.length) return
    const box = new Box3()
    for (const { x, y } of points) {
      box.expandByPoint(new Vector3(x, 0, y))
      box.expandByPoint(new Vector3(x, wallHeight ?? 0, y))
    }
    const center = box.getCenter(new Vector3())
    const span = Math.max(box.getSize(new Vector3()).length(), 0.1)
    const radius = span * 1.35 * Math.max(1, size.height / size.width)
    const direction = cameraView === 'top' ? new Vector3(0, 1, 0.0001) : new Vector3(0.8, 0.7, 1)
    camera.position.copy(center).addScaledVector(direction.normalize(), radius)
    controls.target.copy(center)
    controls.minDistance = span * 0.04
    controls.maxDistance = radius * 12
    if ('far' in camera) {
      Object.assign(camera, { near: Math.min(0.1, span / 1000), far: radius * 20 })
      if (camera instanceof ThreeOrthographicCamera) {
        const zoom = Math.min(size.width, size.height) / (span * 1.2)
        Object.assign(camera, { zoom })
        controls.minZoom = zoom / 12
        controls.maxZoom = zoom * 20
      }
      camera.updateProjectionMatrix()
    }
    controls.update()
  }, [camera, cameraView, resetView, size.height, size.width])

  return <OrbitControls ref={orbit} makeDefault enableRotate={cameraView === 'perspective' && !pan}
    mouseButtons={{ LEFT: pan || cameraView === 'top' ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }} />
}

type Props = {
  rooms: { id: string; vertexIds: string[] }[]
  selection: Selection | null
  select: (selection: Selection | null) => void
  cameraView: CameraView
  resetView: number
  grid: boolean
  gridStep: number
  pan: boolean
}

export default function SceneRenderer({ rooms, selection, select, cameraView, resetView, grid, gridStep, pan }: Props) {
  const { walls, vertices, wallHeight } = usePlan()
  if (!wallHeight) return null

  return (
    <section aria-label="Модель этажа в 3D" className="scene">
      <Canvas camera={{ position: [7, 6, 9], fov: 48 }} onPointerMissed={() => { if (!pan) select(null) }}>
        <color attach="background" args={['#172125']} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[4, 9, 6]} intensity={2} />
        {cameraView === 'top' && <OrthographicCamera makeDefault />}
        <CameraControls cameraView={cameraView} resetView={resetView} pan={pan} />
        {grid && <Grid infiniteGrid fadeDistance={45} cellSize={gridStep} sectionSize={gridStep * 5}
          position={[0, -0.01, 0]} cellColor="#41595b" sectionColor="#698887" />}
        {rooms.map(({ id, vertexIds }) => {
          const floor = new Shape()
          vertexIds.forEach((vertexId, index) => {
            const point = vertices[vertexId]
            if (index === 0) floor.moveTo(point.x, point.y)
            else floor.lineTo(point.x, point.y)
          })
          floor.closePath()
          return <mesh key={id} rotation={[Math.PI / 2, 0, 0]} raycast={() => {}}>
            <shapeGeometry args={[floor]} />
            <meshStandardMaterial color="#527772" side={DoubleSide} />
          </mesh>
        })}
        {walls.map(({ id, startId, endId, thickness }) => {
          const start = vertices[startId]
          const end = vertices[endId]
          const angle = Math.atan2(end.y - start.y, end.x - start.x)
          const selected = selection?.kind === 'wall' ? selection.id === id : selection?.id === startId || selection?.id === endId
          return (
            <mesh key={id} position={[(start.x + end.x) / 2, wallHeight / 2, (start.y + end.y) / 2]} rotation={[0, -angle, 0]}
              onClick={event => {
                if (pan || event.delta > 4) return
                event.stopPropagation()
                select({ kind: 'wall', id })
              }}>
              <boxGeometry args={[distance(start, end), wallHeight, thickness]} />
              <meshStandardMaterial color={selected ? '#55aaff' : '#81e4bc'} />
            </mesh>
          )
        })}
      </Canvas>
      <p className="scene-height">Высота стен {wallHeight.toFixed(2)} м</p>
    </section>
  )
}
