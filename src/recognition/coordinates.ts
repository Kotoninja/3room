export function recognitionSize(width: number, height: number) {
  const scale = 512 / Math.max(width, height)
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  return { w, h, paddedWidth: Math.ceil(w / 32) * 32, paddedHeight: Math.ceil(h / 32) * 32 }
}

export function imageCoordinates(width: number, height: number, w: number, h: number) {
  return ([x, y]: [number, number]) => ({ x: x * width / w, y: y * height / h })
}
