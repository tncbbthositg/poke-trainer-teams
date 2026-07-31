import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

const sourceDir = 'public/data'
const targetDir = 'src/data/generated'

async function main() {
  await mkdir(targetDir, { recursive: true })
  const entries = await readdir(sourceDir)
  const jsonFiles = entries.filter((entry) => extname(entry) === '.json').sort()

  for (const file of jsonFiles) {
    await copyFile(join(sourceDir, file), join(targetDir, file))
  }

  console.log(`Synced ${jsonFiles.length} data snapshots into ${targetDir}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
