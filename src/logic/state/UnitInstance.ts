// UnitInstance — the runtime representation of a unit during a run (v0.7).
//
// Replaces the v0.6 Unit interface. Carries installed module instances with
// state (cooldowns), and computes derived stats (maxHp, ruleSlots, etc.)
// from chassis base + passive effects. No stored derived stats.

import type { UnitId, Side, SlotRef } from './types'
import type { GambitList } from '../gambits/types'
import type { ChassisId } from '../../content/schema/chassis'
import { getChassisDef } from '../content/chassisLoader'
import { getActiveModuleDef, getPassiveModuleDef } from '../content/moduleLoader'
import type { ActiveModuleDef } from '../../content/schema/module'
import type { StatusKind } from '../../content/schema/status'

// ── Module instance types ─────────────────────────────────────────────────

export interface ActiveModuleInstance {
  defId: string
  cooldownRemaining: number // 0 = ready to fire
}

export interface PassiveModuleInstance {
  defId: string
}

// ── Status-effect instance (v0.8) ─────────────────────────────────────────

export interface StatusEffectInstance {
  kind: StatusKind
  magnitude: number
  durationRemaining: number
  sourceUnitId: UnitId
}

// ── UnitInstance class ────────────────────────────────────────────────────

export class UnitInstance {
  readonly id: UnitId
  readonly side: Side
  slot: SlotRef
  readonly chassis: ChassisId
  hp: number
  activeModules: ActiveModuleInstance[]
  passiveModules: PassiveModuleInstance[]
  statusEffects: StatusEffectInstance[]
  gambits: GambitList

  constructor(
    id: UnitId,
    side: Side,
    slot: SlotRef,
    chassis: ChassisId,
    hp: number,
    activeModules: ActiveModuleInstance[],
    passiveModules: PassiveModuleInstance[],
    gambits: GambitList,
    statusEffects: StatusEffectInstance[] = [],
  ) {
    this.id = id
    this.side = side
    this.slot = slot
    this.chassis = chassis
    this.hp = hp
    this.activeModules = activeModules
    this.passiveModules = passiveModules
    this.statusEffects = statusEffects
    this.gambits = gambits
  }

  // --- Computed stats (derived live from chassis base + passive effects) ---

  private sumPassiveEffect(kind: string): number {
    let total = 0
    for (const pm of this.passiveModules) {
      const def = getPassiveModuleDef(pm.defId)
      for (const eff of def.effects) {
        if (eff.kind === kind) total += eff.value
      }
    }
    return total
  }

  get maxHp(): number {
    return getChassisDef(this.chassis).baseHp + this.sumPassiveEffect('bonus_hp')
  }

  get effectiveActiveSlots(): number {
    return getChassisDef(this.chassis).activeSlots + this.sumPassiveEffect('extra_active_slot')
  }

  get ruleSlots(): number {
    return getChassisDef(this.chassis).baseRuleSlots + this.sumPassiveEffect('extra_rule_slot')
  }

  get bonusDamage(): number {
    let total = this.sumPassiveEffect('bonus_damage')
    for (const s of this.statusEffects) {
      if (s.kind === 'damage_boost') total += s.magnitude
    }
    return total
  }

  /** True if any `disabled` status is active. Drives gambit interpreter early-out (v0.8). */
  isDisabled(): boolean {
    return this.statusEffects.some(s => s.kind === 'disabled')
  }

  /** Current HP as a percentage of maxHp (0–100+). Single source of truth for HP% checks. */
  getHpPercentage(): number {
    return this.maxHp > 0 ? (this.hp / this.maxHp) * 100 : 0
  }

  // --- Module management ---

  canInstallActive(): boolean {
    return this.activeModules.length < this.effectiveActiveSlots
  }

  canInstallPassive(): boolean {
    return this.passiveModules.length < getChassisDef(this.chassis).passiveSlots
  }

  installActive(defId: string): void {
    if (!this.canInstallActive()) throw new Error(`No active slot available on unit ${this.id}`)
    this.activeModules.push({ defId, cooldownRemaining: 0 })
  }

  installPassive(defId: string): void {
    if (!this.canInstallPassive()) throw new Error(`No passive slot available on unit ${this.id}`)
    this.passiveModules.push({ defId })
  }

  removeActive(index: number): void {
    if (this.activeModules.length <= 1) {
      throw new Error(`Cannot remove last active module from unit ${this.id}`)
    }
    this.activeModules.splice(index, 1)
  }

  removePassive(index: number): void {
    this.passiveModules.splice(index, 1)
  }

  // --- Combat helpers ---

  /** Active modules that are off cooldown and ready to fire. */
  getAvailableActions(): ActiveModuleInstance[] {
    return this.activeModules.filter(m => m.cooldownRemaining === 0)
  }

  /** Decrement all non-zero cooldowns by 1. Called at the start of each round. */
  tickCooldowns(): void {
    for (const m of this.activeModules) {
      if (m.cooldownRemaining > 0) m.cooldownRemaining--
    }
  }

  /** Set initial cooldowns at combat start (store N+1 so first tick leaves N). */
  applyInitialCooldowns(): void {
    for (const m of this.activeModules) {
      const ic = getModuleInitialCooldown(m.defId)
      if (ic > 0) {
        m.cooldownRemaining = ic + 1
      }
    }
  }

  /** Set cooldown after using a module (store cooldown+1; see resolver comment). */
  setCooldownAfterUse(defId: string): void {
    const mod = this.activeModules.find(m => m.defId === defId)
    if (!mod) return
    const cd = getModuleCooldown(defId)
    if (cd > 0) {
      mod.cooldownRemaining = cd + 1
    }
  }

  /** Get the ActiveModuleDef for a module installed on this unit. */
  getActiveModuleDefById(defId: string): ActiveModuleDef | undefined {
    const mod = this.activeModules.find(m => m.defId === defId)
    if (!mod) return undefined
    return getActiveModuleDef(defId)
  }

  // --- Status effects (v0.8) ---

  /**
   * Append a status-effect instance. Always stacks — never merges with existing
   * entries of the same kind (Q-V8-2).
   */
  applyStatus(s: StatusEffectInstance): void {
    this.statusEffects.push({ ...s })
  }

  /** Decrement every status's durationRemaining by 1. Caller handles expiry/removal. */
  decrementStatusDurations(): void {
    for (const s of this.statusEffects) {
      if (s.durationRemaining > 0) s.durationRemaining -= 1
    }
  }

  /** Remove and return all statuses whose duration has hit 0. */
  removeExpiredStatuses(): StatusEffectInstance[] {
    const expired: StatusEffectInstance[] = []
    this.statusEffects = this.statusEffects.filter(s => {
      if (s.durationRemaining <= 0) {
        expired.push(s)
        return false
      }
      return true
    })
    return expired
  }

  // --- Cloning ---

  // (helpers `getModuleCooldown` / `getModuleInitialCooldown` defined below.)

  /** Deep clone for combat resolver (mutations on the clone don't affect original). */
  clone(): UnitInstance {
    return new UnitInstance(
      this.id,
      this.side,
      { ...this.slot },
      this.chassis,
      this.hp,
      this.activeModules.map(m => ({ ...m })),
      this.passiveModules.map(m => ({ ...m })),
      [...this.gambits],
      this.statusEffects.map(s => ({ ...s })),
    )
  }
}

// ── Module cooldown helpers (v0.8) ────────────────────────────────────────
// Resolve cooldown / initial cooldown across all actionKinds (attack, heal,
// buff, debuff). Each has its own properties block in the schema.

function getModuleCooldown(defId: string): number {
  const def = getActiveModuleDef(defId)
  switch (def.actionKind) {
    case 'attack':
      return def.attackProperties.cooldown
    case 'heal':
      return def.healProperties.cooldown
    case 'buff':
      return def.buffProperties.cooldown
    case 'debuff':
      return def.debuffProperties.cooldown
  }
}

function getModuleInitialCooldown(defId: string): number {
  const def = getActiveModuleDef(defId)
  switch (def.actionKind) {
    case 'attack':
      return def.attackProperties.initialCooldown
    case 'heal':
      return def.healProperties.initialCooldown
    case 'buff':
      return def.buffProperties.initialCooldown
    case 'debuff':
      return def.debuffProperties.initialCooldown
  }
}
