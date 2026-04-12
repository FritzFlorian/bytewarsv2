// Placeholder component — T-6.5 replaces with a flying/wall-mounted silhouette.

export function SecurityDrone() {
  return (
    <div
      className="unit unit-security-drone"
      style={{
        width: 50,
        height: 50,
        background: '#2d5a7c',
        borderRadius: '50%',
        border: '2px solid #1a3d5a',
      }}
      data-placeholder="true"
    />
  )
}
