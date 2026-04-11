import MetricGauge from './MetricGauge'

const ALERT_ICONS = {
  stockout: '🚨',
  low_stock: '⚠️',
  planogram_violation: '📋',
  price_tag_error: '🏷️',
  unauthorized_product: '❌'
}

function timeAgo(timestamp) {
  const diff = (Date.now() - new Date(timestamp)) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  return `${Math.round(diff / 3600)}h ago`
}

export default function AlertCard({ alert, onAcknowledge, compact = false }) {
  const icon = ALERT_ICONS[alert.type] || '🔔'
  const badgeClass = `badge-${alert.priority}`

  return (
    <div
      className={`alert-card animate-slide-in ${alert.status === 'acknowledged' ? 'acknowledged' : ''}`}
      style={{ opacity: alert.status === 'acknowledged' ? 0.6 : 1 }}
    >
      <div className={`alert-icon alert-icon-${alert.priority}`}>
        {icon}
      </div>
      <div className="alert-body">
        <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
          <span className={`badge ${badgeClass}`}>{alert.priority}</span>
          <span className="badge badge-active" style={{ textTransform: 'capitalize' }}>
            {alert.type?.replace('_', ' ')}
          </span>
        </div>
        <div className="alert-title">{alert.title}</div>
        {!compact && <div className="alert-msg">{alert.message}</div>}
        {!compact && alert.suggested_action && (
          <div className="alert-action">
            <span>💡</span>
            <span>{alert.suggested_action}</span>
          </div>
        )}
        {alert.shelf && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            📍 {alert.shelf}
          </div>
        )}
      </div>
      <div className="alert-meta">
        <div className="alert-time">{timeAgo(alert.timestamp)}</div>
        {alert.revenue_impact > 0 && (
          <div className="alert-impact">
            ₹{alert.revenue_impact.toLocaleString()}/hr
          </div>
        )}
        {alert.status === 'active' && onAcknowledge && (
          <button
            onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id) }}
            className="topbar-btn topbar-btn-ghost"
            style={{ fontSize: 10, padding: '4px 8px' }}
          >
            ACK
          </button>
        )}
      </div>
    </div>
  )
}
