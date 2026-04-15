// Siege chassis — heavy elite-tier enemy, devastating long-cooldown cannon.
// Style: Column B (anime-flavored cel-shading, setting.md §4).
// Enemy visual rules (setting.md §3): sharp edges, warning stripes, industrial.
//
// Silhouette notes:
//  - largest footprint in the roster (wider than Overseer's body block) →
//    reads "elite" at a glance
//  - forward-pointing cannon barrel is the defining shape; no other chassis
//    has a long horizontal protrusion
//  - hazard stripes + riveted armour plates reinforce elite-tier threat
//
// Bounding box: 112 × 90 px.

import '../../styles/units.css'

export function Siege() {
  return (
    <div className="unit unit-siege">
      <div className="siege-tread" />
      <div className="siege-tread-wheel siege-tread-wheel--1" />
      <div className="siege-tread-wheel siege-tread-wheel--2" />
      <div className="siege-tread-wheel siege-tread-wheel--3" />
      <div className="siege-tread-wheel siege-tread-wheel--4" />
      <div className="siege-tread-wheel siege-tread-wheel--5" />
      <div className="siege-skirt" />
      <div className="siege-hull" />
      <div className="siege-stripe" />
      <div className="siege-rivet siege-rivet--tl" />
      <div className="siege-rivet siege-rivet--tr" />
      <div className="siege-rivet siege-rivet--bl" />
      <div className="siege-rivet siege-rivet--br" />
      <div className="siege-turret" />
      <div className="siege-barrel" />
      <div className="siege-barrel-ring" />
      <div className="siege-muzzle" />
    </div>
  )
}
