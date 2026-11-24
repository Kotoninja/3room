import { createRoot } from 'react-dom/client'
import App from '../../src/App'
import { MockRecognitionProvider } from '../../src/recognition/types'
import '../../src/index.css'

const mode = new URLSearchParams(location.search).get('mode')
let uploads = 0
const recognitionProvider = new MockRecognitionProvider(() => {
  if (mode === 'error') throw new Error('Тестовая ошибка модели.')
  const points = [{ x: 100, y: 50 }, { x: 300, y: 50 }, { x: 300, y: 150 }]
  return {
    walls: ++uploads === 1
      ? points.slice(1).map((end, index) => ({ start: points[index], end, thickness: 10 }))
      : [{ start: points[0], end: points[0], thickness: 10 }],
    openings: [],
    tolerance: 2,
  }
})

createRoot(document.getElementById('root')!).render(<App recognitionProvider={recognitionProvider} />)
