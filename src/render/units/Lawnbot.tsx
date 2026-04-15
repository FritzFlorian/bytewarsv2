// Lawnbot-class chassis — treaded yard-maintenance robot, player tank.
// Style: Column B (anime-flavored cel-shading, setting.md §4).
// Parts are separate elements so module attachments can be added as children.
//
// Silhouette notes:
//  - wide low stance with continuous tracked base (not wheels) → reads "tank"
//  - forward-projecting mower-deck cowl, distinct from Vacuum's round body
//  - exhaust stack on the back-top → unique to this chassis
//
// Bounding box: 88 × 58 px.

import '../../styles/units.css'

export function Lawnbot() {
  return (
    <div className="unit unit-lawnbot">
      <div className="lawnbot-stack" />
      <div className="lawnbot-stack-cap" />
      <div className="lawnbot-body" />
      <div className="lawnbot-grill" />
      <div className="lawnbot-eye lawnbot-eye--left" />
      <div className="lawnbot-eye lawnbot-eye--right" />
      <div className="lawnbot-deck" />
      <div className="lawnbot-tread" />
    </div>
  )
}
