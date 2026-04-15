// Swarmer chassis — low-HP, high-speed regular enemy.
// Style: Column B (anime-flavored cel-shading, setting.md §4).
// Enemy visual rules (setting.md §3): sharp edges, warning stripes, industrial.
//
// Silhouette notes:
//  - insectoid four-leg stance reads aggressive & low, unlike any player chassis
//  - sharp angled carapace (clip-path) — no rounded dome
//  - single crimson eye + warning hazard stripe
//
// Bounding box: 64 × 44 px.

import '../../styles/units.css'

export function Swarmer() {
  return (
    <div className="unit unit-swarmer">
      <div className="swarmer-leg swarmer-leg--fl" />
      <div className="swarmer-leg swarmer-leg--fr" />
      <div className="swarmer-leg swarmer-leg--bl" />
      <div className="swarmer-leg swarmer-leg--br" />
      <div className="swarmer-shell" />
      <div className="swarmer-stripe" />
      <div className="swarmer-eye" />
      <div className="swarmer-mandible swarmer-mandible--left" />
      <div className="swarmer-mandible swarmer-mandible--right" />
    </div>
  )
}
