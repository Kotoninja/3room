const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

export function readRasterDimensions(bytes: Uint8Array) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const invalid = new Error('Не удалось открыть изображение.')
  if (pngSignature.every((byte, index) => bytes[index] === byte)) {
    if (bytes.length < 24 || data.getUint32(12) !== 0x49484452) throw invalid
    const width = data.getUint32(16)
    const height = data.getUint32(20)
    if (!width || !height) throw invalid
    return { width, height }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 3 < bytes.length && bytes[offset] === 0xff) {
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (offset + 2 > bytes.length || marker === 0xda || marker === 0xd9) break
      const length = data.getUint16(offset)
      if (length < 2 || offset + length > bytes.length) break
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && length >= 8) {
        const height = data.getUint16(offset + 3)
        const width = data.getUint16(offset + 5)
        if (!width || !height) throw invalid
        return { width, height }
      }
      offset += length
    }
    throw invalid
  }
  if (bytes.length < 8) throw invalid
  throw new Error('Выберите изображение PNG или JPEG.')
}
