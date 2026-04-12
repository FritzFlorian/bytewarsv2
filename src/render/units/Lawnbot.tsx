// Placeholder component — T-6.4 replaces with a cel-shaded flat-vector
// silhouette per setting.md §4. Minimal shape shipped now so the chassis
// drift guard and exhaustive dispatches compile.

export function Lawnbot() {
  return (
    <div
      className="unit unit-lawnbot"
      style={{
        width: 72,
        height: 56,
        background: '#4a7c2a',
        borderRadius: '6px 6px 20px 20px',
        border: '2px solid #2d4d1a',
        position: 'relative',
      }}
      data-placeholder="true"
    />
  )
}
