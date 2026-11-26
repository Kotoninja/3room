import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const revision = '9987ced5ca7bb72e705937260c90c9fb9222d800'
const checksum = '8d6fbe7e58b9866001475e2e77c625f8f57384309ac6fcb93b92c4767d1714d4'
const folder = new URL('../public/models/', import.meta.url)
const destination = new URL('floorplannet_lite.onnx', folder)
const matches = (bytes) => createHash('sha256').update(bytes).digest('hex') === checksum
const existing = await readFile(destination).catch(error => {
  if (error.code !== 'ENOENT') throw error
})

if (!existing || !matches(existing)) {
  const source = process.argv[2]
  let model
  if (source) {
    model = await readFile(source)
  } else {
    const response = await fetch(`https://raw.githubusercontent.com/thatguywhodoestecheverysatnight/FloorPlanNet/${revision}/web/public/models/floorplannet_lite.onnx`)
    if (!response.ok) throw new Error(`FloorPlanNet download failed: HTTP ${response.status}`)
    model = Buffer.from(await response.arrayBuffer())
  }
  if (!matches(model)) throw new Error('FloorPlanNet SHA-256 mismatch')
  await mkdir(folder, { recursive: true })
  await writeFile(destination, model)
}
process.stdout.write('FloorPlanNet Lite INT8 is ready for offline use.\n')
