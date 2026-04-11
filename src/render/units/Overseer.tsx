// Overseer chassis — heavy industrial boss unit (v0.4).
// Style: Column B (anime-flavored cel-shading), enemy variant.
// Enemy visual rules (setting.md §3): sharp edges, warning stripes, industrial.
//
// Larger footprint than standard units — wide caterpillar base, reinforced
// body with red warning stripes, articulated side-arms, triple-eye sensor
// cluster on top.
//
// Bounding box: 100 × 110 px.

import '../../styles/units.css'

export function Overseer() {
  return (
    <div className="unit unit-overseer">
      <div className="overseer-sensor">
        <div className="overseer-eye overseer-eye--left" />
        <div className="overseer-eye overseer-eye--centre" />
        <div className="overseer-eye overseer-eye--right" />
      </div>
      <div className="overseer-stripe" />
      <div className="overseer-arm overseer-arm--left" />
      <div className="overseer-arm overseer-arm--right" />
      <div className="overseer-body" />
      <div className="overseer-base" />
      <div className="overseer-tread">
        <div className="overseer-tread-wheel overseer-tread-wheel--1" />
        <div className="overseer-tread-wheel overseer-tread-wheel--2" />
        <div className="overseer-tread-wheel overseer-tread-wheel--3" />
        <div className="overseer-tread-wheel overseer-tread-wheel--4" />
        <div className="overseer-tread-wheel overseer-tread-wheel--5" />
      </div>
    </div>
  )
}
