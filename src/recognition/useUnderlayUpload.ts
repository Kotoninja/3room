import { useEffect, useRef, useState } from 'react'
import { usePlan } from '../plan'
import type { Underlay } from '../plan'
import type { RecognitionProvider, RecognitionResult } from './types'
import { GeometryNormalizer } from './geometry'
import { readRasterDimensions } from './raster'

const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_PIXELS = 16_000_000

async function decode(file: File): Promise<Underlay> {
  const dimensions = readRasterDimensions(new Uint8Array(await file.arrayBuffer()))
  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) throw new Error('Изображение превышает 16 мегапикселей.')
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const image = new Image()
  image.src = url
  await image.decode().catch(() => { throw new Error('Не удалось открыть изображение.') })
  if (image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error('Изображение превышает 16 мегапикселей.')
  return { url, width: image.naturalWidth, height: image.naturalHeight }
}

export function useUnderlayUpload(provider: RecognitionProvider, resetEditor: () => void) {
  const current = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [canCancel, setCanCancel] = useState(false)
  const [error, setError] = useState('')
  const [timing, setTiming] = useState<RecognitionResult['timing']>()
  const [pendingUnderlay, setPendingUnderlay] = useState<Underlay | null>(null)
  useEffect(() => () => current.current?.abort(), [])

  function replace(underlay: Underlay) {
    const plan = usePlan.getState()
    if (plan.walls.length && !window.confirm('Заменить текущую подложку и модель?')) return false
    plan.loadUnderlay(underlay)
    setPendingUnderlay(null)
    setTiming(undefined)
    resetEditor()
    return true
  }

  async function load(file: File) {
    current.current?.abort()
    const request = new AbortController()
    current.current = request
    setPendingUnderlay(null)
    setError('')
    setBusy(true)
    setCanCancel(false)
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('Размер файла превышает 20 МиБ.')
      const underlay = await decode(file)
      request.signal.throwIfAborted()
      const keepExisting = usePlan.getState().walls.length > 0
      if (keepExisting) setPendingUnderlay(underlay)
      else replace(underlay)
      setCanCancel(true)
      const result = await provider.recognize(file, request.signal)
      request.signal.throwIfAborted()
      if (!result.walls.length) throw new Error('Стены не найдены. Можно продолжить вручную.')
      const graph = GeometryNormalizer(result.walls, result.tolerance)
      if (!graph.walls.length) throw new Error('Модель не нашла пригодных стен. Можно продолжить вручную.')
      if (keepExisting && !replace(underlay)) return
      usePlan.getState().applyRecognizedGraph(graph, result.openings)
      setTiming(result.timing)
    } catch (error) {
      if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Ошибка распознавания.')
    } finally {
      if (current.current === request) setBusy(false)
    }
  }

  return {
    load, busy, error, timing, pendingUnderlay, canCancel,
    useManually: () => {
      current.current?.abort()
      setBusy(false)
      if (pendingUnderlay && replace(pendingUnderlay)) setError('')
    },
  }
}
