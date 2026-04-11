// Vacuum-class chassis — low, round domestic cleaner, player front-liner.
// Style: Column B (anime-flavored cel-shading, setting.md §4).
// Parts are separate elements so module attachments can be added as children.
//
// Bounding box: 72 × 56 px.

import '../../styles/units.css'

export function Vacuum() {
  return (
    <div className="unit unit-vacuum">
      <div className="vacuum-body" />
      <div className="vacuum-dome" />
      <div className="vacuum-eye" />
      <div className="vacuum-wheel vacuum-wheel--left" />
      <div className="vacuum-wheel vacuum-wheel--right" />
    </div>
  )
}
