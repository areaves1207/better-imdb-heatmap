// Packs dist-extension/ into tv-heatmap-<version>.zip for the Chrome Web Store.
// The store wants manifest.json at the top level of the zip, not inside a folder.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { zipSync } from 'fflate'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist-extension')

const files = {}
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else files[path.relative(dist, full).split(path.sep).join('/')] = readFileSync(full)
  }
}
walk(dist)

if (!files['manifest.json']) throw new Error('dist-extension/manifest.json not found; run npm run build:extension')
const { version } = JSON.parse(files['manifest.json'])
const out = path.join(root, `tv-heatmap-${version}.zip`)
writeFileSync(out, zipSync(files, { level: 9 }))
console.log(`wrote ${path.basename(out)} (${Object.keys(files).length} files, ${(statSync(out).size / 1024).toFixed(0)} KB)`)
