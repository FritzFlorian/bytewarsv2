// Butler-class chassis — humanoid service robot, player balanced attacker.
// Style: Column B (anime-flavored cel-shading, setting.md §4).
// Parts are separate elements so module attachments can be added as children.
//
// Bounding box: 60 × 88 px.
// Module attachment points:
//   .butler-badge  — chest slot (tool badge, shield, etc.)
//   .butler-arm--left / .butler-arm--right — arm slots

import '../../styles/units.css'

export function Butler() {
  return (
    <div className="unit unit-butler">
      <div className="butler-head" />
      <div className="butler-visor" />
      <div className="butler-neck" />
      <div className="butler-arm butler-arm--left" />
      <div className="butler-torso">
        <div className="butler-badge" />
      </div>
      <div className="butler-arm butler-arm--right" />
      <div className="butler-caster butler-caster--left" />
      <div className="butler-caster butler-caster--right" />
    </div>
  )
}
