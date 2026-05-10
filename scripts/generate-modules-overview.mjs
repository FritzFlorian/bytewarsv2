// Reads every JSON file in src/content/modules/ and emits two Markdown tables
// (active + passive) into test-results/artifacts/modules/modules-overview.md.
// `pnpm refresh-readme-artifacts:copy` then promotes the file into doc/generated/
// so the README's MODULES block can embed it. Plain Node — no Zod, no Vite —
// because the actual module catalog is already validated on app boot. If a JSON
// shape is off, generation will throw with a clear message.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const MODULES_DIR = resolve('src/content/modules')
const OUT_DIR = resolve('test-results/artifacts/modules')
const OUT_FILE = `${OUT_DIR}/modules-overview.md`

const sideLabel = { player: 'Player', enemy: 'Enemy', both: 'Both' }
const rarityCell = r => (typeof r === 'number' ? String(r) : '—')

function loadModules() {
  const files = readdirSync(MODULES_DIR).filter(f => f.endsWith('.json'))
  return files.map(f => JSON.parse(readFileSync(`${MODULES_DIR}/${f}`, 'utf8')))
}

function effectString(effect) {
  const v = effect.value
  switch (effect.kind) {
    case 'bonus_hp':
      return `+${v} HP`
    case 'bonus_damage':
      return `+${v} damage`
    case 'extra_active_slot':
      return `+${v} active slot${v === 1 ? '' : 's'}`
    case 'extra_rule_slot':
      return `+${v} rule slot${v === 1 ? '' : 's'}`
    default:
      throw new Error(`Unknown passive effect kind: ${effect.kind}`)
  }
}

function statusRider(spec) {
  // disabled has no meaningful magnitude — skip it.
  const mag = spec.kind === 'disabled' ? '' : `${spec.magnitude} / `
  return `${spec.kind} (${mag}${spec.duration}r)`
}

function activeProps(mod) {
  switch (mod.actionKind) {
    case 'attack':
      return mod.attackProperties
    case 'heal':
      return mod.healProperties
    case 'buff':
      return mod.buffProperties
    case 'debuff':
      return mod.debuffProperties
    default:
      throw new Error(`Unknown active actionKind on ${mod.id}: ${mod.actionKind}`)
  }
}

function effectColumn(mod) {
  switch (mod.actionKind) {
    case 'attack': {
      const base = `${mod.attackProperties.damage} dmg`
      const rider = mod.attackProperties.appliesStatus
        ? ` + ${statusRider(mod.attackProperties.appliesStatus)}`
        : ''
      return base + rider
    }
    case 'heal':
      return `+${mod.healProperties.healAmount} HP`
    case 'buff':
      return statusRider(mod.buffProperties.status)
    case 'debuff':
      return statusRider(mod.debuffProperties.status)
    default:
      throw new Error(`Unknown active actionKind on ${mod.id}: ${mod.actionKind}`)
  }
}

function buildActiveTable(active) {
  const sorted = [...active].sort((a, b) => a.id.localeCompare(b.id))
  const lines = []
  lines.push('| Name | ID | Kind | Side | Rarity | Effect | CD | Init |')
  lines.push('|---|---|---|---|---:|---|---:|---:|')
  for (const m of sorted) {
    const props = activeProps(m)
    lines.push(
      `| ${m.name} | \`${m.id}\` | ${m.actionKind} | ${sideLabel[m.availability]} | ${rarityCell(m.rarity)} | ${effectColumn(m)} | ${props.cooldown} | ${props.initialCooldown} |`,
    )
  }
  return lines.join('\n')
}

function buildPassiveTable(passive) {
  const sorted = [...passive].sort((a, b) => a.id.localeCompare(b.id))
  const lines = []
  lines.push('| Name | ID | Side | Rarity | Effects |')
  lines.push('|---|---|---|---:|---|')
  for (const m of sorted) {
    const effects = m.effects.map(effectString).join(', ')
    lines.push(
      `| ${m.name} | \`${m.id}\` | ${sideLabel[m.availability]} | ${rarityCell(m.rarity)} | ${effects} |`,
    )
  }
  return lines.join('\n')
}

function main() {
  const all = loadModules()
  const active = all.filter(m => m.type === 'active')
  const passive = all.filter(m => m.type === 'passive')

  const parts = [
    '### Active modules',
    '',
    "Provide one-per-turn combat actions: attacks, heals, buffs (apply a positive status to allies), or debuffs (apply a negative status to enemies). Slot into a chassis's active slots; chassis-agnostic. `CD` = cooldown rounds, `Init` = initial cooldown at battle start. Status entries read `kind (magnitude / duration)`.",
    '',
    buildActiveTable(active),
    '',
    '### Passive modules',
    '',
    "Always-on effects. Slot into a chassis's passive slots; chassis-agnostic. Duplicate passive modules stack.",
    '',
    buildPassiveTable(passive),
    '',
    '<sub>Auto-generated — run `/refresh-readme` to refresh.</sub>',
    '',
  ]

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, parts.join('\n'), 'utf8')
  console.log(`Wrote ${OUT_FILE} (${active.length} active, ${passive.length} passive modules).`)
}

main()
