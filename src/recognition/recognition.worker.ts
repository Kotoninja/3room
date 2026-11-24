import * as ort from 'onnxruntime-web/wasm'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import { imageCoordinates, recognitionSize } from './coordinates'
import { vectorize } from './upstream/vectorize'
import type { RecognitionResult } from './types'

ort.env.wasm.numThreads = 1
ort.env.wasm.wasmPaths = { wasm: new URL(wasmUrl, self.location.href).href }

const mean = [0.485, 0.456, 0.406]
const std = [0.229, 0.224, 0.225]
const modelUrl = new URL(import.meta.env.BASE_URL + 'models/floorplannet_lite.onnx', self.location.origin)

async function recognize(file: File): Promise<RecognitionResult> {
  const response = await fetch(modelUrl)
  if (!response.ok) throw new Error('Не найдены веса FloorPlanNet. Выполните npm run prepare:recognition.')
  const session = await ort.InferenceSession.create(await response.arrayBuffer(), { executionProviders: ['wasm'] })
  try {
    const image = await createImageBitmap(file)
    const { width, height } = image
    const { w, h, paddedWidth, paddedHeight } = recognitionSize(width, height)
    const canvas = new OffscreenCanvas(paddedWidth, paddedHeight)
    const context = canvas.getContext('2d')!
    context.fillStyle = 'white'
    context.fillRect(0, 0, paddedWidth, paddedHeight)
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, w, h)
    image.close()
    const pixels = context.getImageData(0, 0, paddedWidth, paddedHeight).data
    const plane = paddedWidth * paddedHeight
    const data = new Float32Array(3 * plane)
    for (let channel = 0; channel < 3; channel++) {
      for (let index = 0; index < plane; index++) {
        data[channel * plane + index] = (pixels[index * 4 + channel] / 255 - mean[channel]) / std[channel]
      }
    }
    const inferenceStart = performance.now()
    const output = await session.run({
      [session.inputNames[0]]: new ort.Tensor('float32', data, [1, 3, paddedHeight, paddedWidth]),
    })
    const inferenceMs = performance.now() - inferenceStart
    const vectorStart = performance.now()
    const logits = output[session.outputNames[0]].data as Float32Array
    if (logits.length !== 5 * plane) throw new Error('Модель вернула неожиданный размер маски.')
    const labels = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const index = y * paddedWidth + x
        let best = 0
        for (let c = 1; c < 5; c++) if (logits[c * plane + index] > logits[best * plane + index]) best = c
        labels[y * w + x] = best
      }
    }
    const geometry = vectorize(labels, w, h)
    const toImage = imageCoordinates(width, height, w, h)
    const pixelsPerSample = (width / w + height / h) / 2
    return {
      walls: geometry.walls.map(wall => ({ start: toImage(wall.p1), end: toImage(wall.p2), thickness: wall.thickness * pixelsPerSample })),
      openings: geometry.openings.map(({ kind, polygon }) => ({ kind, polygon: polygon.map(toImage) })),
      tolerance: 2 * pixelsPerSample,
      timing: { width: w, height: h, inferenceMs, vectorizationMs: performance.now() - vectorStart },
    }
  } finally {
    await session.release()
  }
}

self.onmessage = async ({ data }: MessageEvent<File>) => {
  try {
    self.postMessage({ result: await recognize(data) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Ошибка локального распознавания.' })
  }
}
