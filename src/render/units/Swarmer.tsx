// Placeholder component — T-6.6 replaces with an aggressive low-profile enemy.

export function Swarmer() {
  return (
    <div
      className="unit unit-swarmer"
      style={{
        width: 56,
        height: 40,
        background: '#7c2a2a',
        clipPath: 'polygon(0 40%, 20% 0, 80% 0, 100% 40%, 90% 100%, 10% 100%)',
      }}
      data-placeholder="true"
    />
  )
}
