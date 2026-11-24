import type { Point } from '../plan'

export type CandidateWall = { start: Point; end: Point; thickness: number }
export type OpeningHint = { kind: 'door' | 'window'; polygon: Point[] }
export type RecognitionResult = {
  walls: CandidateWall[]
  openings: OpeningHint[]
  tolerance: number
  timing?: { width: number; height: number; inferenceMs: number; vectorizationMs: number }
}

export interface RecognitionProvider {
  recognize(file: File, signal: AbortSignal): Promise<RecognitionResult>
}

export class MockRecognitionProvider implements RecognitionProvider {
  private readonly response: () => RecognitionResult | Promise<RecognitionResult>

  constructor(response: () => RecognitionResult | Promise<RecognitionResult>) {
    this.response = response
  }

  async recognize(_file: File, signal: AbortSignal) {
    signal.throwIfAborted()
    const result = await this.response()
    signal.throwIfAborted()
    return result
  }
}
