import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`)
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

export function nowIso() {
  return new Date().toISOString()
}
