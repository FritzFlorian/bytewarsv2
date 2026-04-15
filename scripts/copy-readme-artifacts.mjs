// Copies README artifacts from the gitignored Playwright scratch dir into
// the committed paths under doc/. Invoked by `pnpm refresh-readme-artifacts`
// after the generating e2e specs have run. Node version exists so the copy
// step is cross-platform (the previous shell pipeline was POSIX-only).

import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const SCRATCH = resolve('test-results/artifacts')
const DOC = resolve('doc')

function requireDir(path) {
  try {
    readdirSync(path)
  } catch {
    console.error(
      `missing ${path} — run the generating e2e specs first (pnpm refresh-readme-artifacts:e2e).`,
    )
    process.exit(1)
  }
}

requireDir(`${SCRATCH}/readme`)
requireDir(`${SCRATCH}/chassis`)

// Current State screenshots: overwrite the three fixed filenames.
const README_OUT = `${DOC}/screenshots/readme`
mkdirSync(README_OUT, { recursive: true })
for (const file of ['map.png', 'editor.png', 'combat.png']) {
  cpSync(`${SCRATCH}/readme/${file}`, `${README_OUT}/${file}`)
}

// Per-chassis screenshots: wipe the target dir first so a chassis removed
// from the roster doesn't leave its stale PNG behind. The spec already
// wipes the scratch dir for the same reason — doing it here too keeps the
// committed state consistent with the scratch output.
const CHASSIS_OUT = `${DOC}/screenshots/chassis`
rmSync(CHASSIS_OUT, { recursive: true, force: true })
mkdirSync(CHASSIS_OUT, { recursive: true })
for (const entry of readdirSync(`${SCRATCH}/chassis`)) {
  if (entry.endsWith('.png')) {
    cpSync(`${SCRATCH}/chassis/${entry}`, `${CHASSIS_OUT}/${entry}`)
  }
}

// Generated Markdown block consumed by the README.
const GENERATED_OUT = `${DOC}/generated`
mkdirSync(GENERATED_OUT, { recursive: true })
cpSync(`${SCRATCH}/chassis/chassis-overview.md`, `${GENERATED_OUT}/chassis-overview.md`)

console.log('Copied README artifacts into doc/.')
