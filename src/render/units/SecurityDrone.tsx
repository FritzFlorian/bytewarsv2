// Security-drone chassis — small flying surveillance bot, player ranged.
// Style: Column B (anime-flavored cel-shading, setting.md §4).
// Parts are separate elements so module attachments can be added as children.
//
// Silhouette notes:
//  - airborne stance: body sits high, no wheels/tracks touching ground
//  - quadcopter rotor booms read instantly as "flying", unlike all other chassis
//  - single wide cyan camera lens across the body → "surveillance" cue
//
// Bounding box: 64 × 72 px.

import '../../styles/units.css'

export function SecurityDrone() {
  return (
    <div className="unit unit-security-drone">
      <div className="drone-boom drone-boom--left" />
      <div className="drone-boom drone-boom--right" />
      <div className="drone-rotor drone-rotor--tl" />
      <div className="drone-rotor drone-rotor--tr" />
      <div className="drone-rotor drone-rotor--bl" />
      <div className="drone-rotor drone-rotor--br" />
      <div className="drone-body" />
      <div className="drone-lens" />
      <div className="drone-antenna" />
      <div className="drone-shadow" />
    </div>
  )
}
