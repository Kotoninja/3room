import type { RecognitionProvider, RecognitionResult } from './types'

export class LocalRecognitionProvider implements RecognitionProvider {
  async recognize(file: File, signal: AbortSignal) {
    signal.throwIfAborted()
    const worker = new Worker(new URL('./recognition.worker.ts', import.meta.url), { type: 'module' })
    try {
      return await new Promise<RecognitionResult>((resolve, reject) => {
        const abort = () => finish(() => reject(signal.reason))
        const timeout = setTimeout(() => finish(() => reject(new Error('Превышено время распознавания.'))), 60_000)
        function finish(callback: () => void) {
          clearTimeout(timeout)
          signal.removeEventListener('abort', abort)
          callback()
        }
        signal.addEventListener('abort', abort, { once: true })
        worker.onmessage = ({ data }: MessageEvent<{ result: RecognitionResult } | { error: string }>) =>
          finish(() => 'result' in data ? resolve(data.result) : reject(new Error(data.error)))
        worker.onerror = (event) => finish(() => reject(new Error(event.message || 'Не удалось запустить локальную модель.')))
        worker.postMessage(file)
      })
    } finally {
      worker.terminate()
    }
  }
}
