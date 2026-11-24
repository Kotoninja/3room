import { Bounds, Grid, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { DoubleSide, Shape } from 'three'
import { distance, usePlan } from './plan'

export default function SceneRenderer({ rooms }: { rooms: { id: string; vertexIds: string[] }[] }) {
  const { walls, vertices, wallHeight } = usePlan()

  if (!wallHeight) return null

  return (
    <section aria-label="Модель этажа в 3D" className="scene">
      <Canvas camera={{ position: [7, 6, 9], fov: 48 }}>
        <color attach="background" args={['#172125']} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[4, 9, 6]} intensity={2} />
        <OrbitControls makeDefault />
        <Grid infiniteGrid fadeDistance={45} position={[0, -0.01, 0]} cellColor="#41595b" sectionColor="#698887" />
        <Bounds fit clip observe margin={1.6}>
          {rooms.map(({ id, vertexIds }) => {
            const floor = new Shape()
            vertexIds.forEach((vertexId, index) => {
              const point = vertices[vertexId]
              if (index === 0) floor.moveTo(point.x, point.y)
              else floor.lineTo(point.x, point.y)
            })
            floor.closePath()
            return <mesh key={id} rotation={[Math.PI / 2, 0, 0]}>
              <shapeGeometry args={[floor]} />
              <meshStandardMaterial color="#527772" side={DoubleSide} />
            </mesh>
          })}
          {walls.map(({ id, startId, endId, thickness }) => {
            const start = vertices[startId]
            const end = vertices[endId]
            const angle = Math.atan2(end.y - start.y, end.x - start.x)
            return (
              <mesh
                key={id}
                position={[(start.x + end.x) / 2, wallHeight / 2, (start.y + end.y) / 2]}
                rotation={[0, -angle, 0]}
              >
                <boxGeometry args={[distance(start, end), wallHeight, thickness]} />
                <meshStandardMaterial color="#81e4bc" />
              </mesh>
            )
          })}
        </Bounds>
      </Canvas>
      <p className="scene-height">Высота стен {wallHeight.toFixed(2)} м</p>
    </section>
  )
}
