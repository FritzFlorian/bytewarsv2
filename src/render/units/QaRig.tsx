// QA-Rig chassis — factory quality-assurance test rig, enemy front-liner.
// Style: Column B (anime-flavored cel-shading, setting.md §4).
// Enemy visual rules (setting.md §3): sharper edges, fewer rounded corners,
// warning stripes, more industrial than domestic player units.
//
// Bounding box: 80 × 80 px.

import '../../styles/units.css'

export function QaRig() {
  return (
    <div className="unit unit-qa-rig">
      <div className="qa-eye" />
      <div className="qa-sensor-bar" />
      <div className="qa-stripe" />
      <div className="qa-body" />
      <div className="qa-tread">
        <div className="qa-wheel qa-wheel--1" />
        <div className="qa-wheel qa-wheel--2" />
        <div className="qa-wheel qa-wheel--3" />
        <div className="qa-wheel qa-wheel--4" />
      </div>
    </div>
  )
}
