/**
 * Radial gauge component for health/compliance scores
 */
export default function MetricGauge({ value = 0, size = 100, label = '', color }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const getColor = (v) => {
    if (color) return color
    if (v >= 80) return 'var(--accent-emerald)'
    if (v >= 60) return 'var(--accent-amber)'
    return 'var(--critical)'
  }

  const c = getColor(value)

  return (
    <div className="gauge-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2} cy={size / 2}
          r={radius}
          fill="none"
          stroke={c}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div className="gauge-value" style={{ color: c, fontSize: size < 90 ? 16 : 20 }}>
        {Math.round(value)}
      </div>
      {label && (
        <div className="gauge-label" style={{ bottom: size < 90 ? 12 : 18 }}>
          {label}
        </div>
      )}
    </div>
  )
}
