import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dbPath = join(root, 'public/data/jsfnd_database.sqlite')
const schemaPath = join(root, 'schema.sql')

mkdirSync(join(root, 'public/data'), { recursive: true })
if (existsSync(dbPath)) unlinkSync(dbPath)
execSync(`sqlite3 "${dbPath}" < "${schemaPath}"`, { shell: '/bin/zsh' })
console.log('SQLite seed written:', dbPath)

const docsAsset = join(root, 'docs/assets/dashboard-preview.png')
const publicDocs = join(root, 'public/docs/assets')
if (existsSync(docsAsset)) {
  mkdirSync(publicDocs, { recursive: true })
  copyFileSync(docsAsset, join(publicDocs, 'dashboard-preview.png'))
}
