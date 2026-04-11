/**
 * Store Floor Map — SVG overlay with shelf status colors
 */

const AISLES = [
  { id: 'A', label: 'Aisle A\nBeverages', x: 8, y: 15, w: 18, h: 70 },
  { id: 'B', label: 'Aisle B\nSnacks', x: 30, y: 15, w: 18, h: 70 },
  { id: 'C', label: 'Aisle C\nDairy', x: 52, y: 15, w: 18, h: 70 },
  { id: 'D', label: 'Aisle D\nGrains', x: 74, y: 15, w: 18, h: 70 },
]

function getAisleColor(score) {
  if (score === undefined) return '#334155'
  if (score >= 80) return 'rgba(16, 185, 129, 0.7)'
  if (score >= 60) return 'rgba(245, 158, 11, 0.7)'
  return 'rgba(239, 68, 68, 0.7)'
}

export default function ShelfMap({ shelves = [], onAisleClick }) {
  const aisleScores = {}
  shelves.forEach(s => {
    if (!aisleScores[s.aisle]) aisleScores[s.aisle] = []
    aisleScores[s.aisle].push(s.health_score || 0)
  })

  const avgScores = {}
  Object.entries(aisleScores).forEach(([aisle, scores]) => {
    avgScores[aisle] = scores.reduce((a, b) => a + b, 0) / scores.length
  })

  return (
    <div className="floor-map" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 20, position: 'relative' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span>🏪 Store Floor Plan — SuperMart Ahmedabad</span>
        <span>
          <span style={{ color: 'var(--accent-emerald)' }}>● Good</span>
          &nbsp; <span style={{ color: 'var(--accent-amber)' }}>● Low</span>
          &nbsp; <span style={{ color: 'var(--critical)' }}>● Critical</span>
        </span>
      </div>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '90%' }}>
        {/* Store boundary */}
        <rect x="2" y="2" width="96" height="96" rx="2"
              fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

        {/* Entrance */}
        <rect x="40" y="94" width="20" height="4" fill="rgba(59,130,246,0.3)" />
        <text x="50" y="92" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="2.5">ENTRANCE</text>

        {/* Checkout area */}
        <rect x="5" y="85" width="90" height="7" rx="1"
              fill="rgba(139,92,246,0.15)" stroke="rgba(139,92,246,0.2)" strokeWidth="0.5" />
        <text x="50" y="89.5" textAnchor="middle" fill="rgba(139,92,246,0.7)" fontSize="2.5">CHECKOUT COUNTERS</text>

        {/* Aisles */}
        {AISLES.map(aisle => {
          const score = avgScores[aisle.id]
          const color = getAisleColor(score)
          const lines = aisle.label.split('\n')
          return (
            <g key={aisle.id} onClick={() => onAisleClick && onAisleClick(aisle.id)}
               style={{ cursor: 'pointer' }}>
              <rect x={aisle.x} y={aisle.y} width={aisle.w} height={aisle.h}
                    rx="1.5" fill={color}
                    stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
              <text x={aisle.x + aisle.w / 2} y={aisle.y + aisle.h / 2 - 4}
                    textAnchor="middle" fill="white" fontSize="2.8" fontWeight="bold">
                {lines[0]}
              </text>
              <text x={aisle.x + aisle.w / 2} y={aisle.y + aisle.h / 2 + 1.5}
                    textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="2.2">
                {lines[1]}
              </text>
              {score !== undefined && (
                <text x={aisle.x + aisle.w / 2} y={aisle.y + aisle.h / 2 + 6}
                      textAnchor="middle" fill="white" fontSize="3.5" fontWeight="bold">
                  {Math.round(score)}%
                </text>
              )}
              {/* Shelf markers */}
              {[0.25, 0.5, 0.75].map((frac, i) => (
                <rect key={i}
                      x={aisle.x + 1} y={aisle.y + aisle.h * frac - 1}
                      width={aisle.w - 2} height={1.5} rx="0.5"
                      fill="rgba(255,255,255,0.12)" />
              ))}
            </g>
          )
        })}

        {/* Cold storage indicator */}
        <rect x="5" y="5" width="90" height="8" rx="1"
              fill="rgba(34,211,238,0.08)" stroke="rgba(34,211,238,0.2)" strokeWidth="0.5" />
        <text x="50" y="9.5" textAnchor="middle" fill="rgba(34,211,238,0.6)" fontSize="2.5">
          ❄ COLD STORAGE & RECEIVING
        </text>
      </svg>
    </div>
  )
}
