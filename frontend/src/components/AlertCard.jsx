import MetricGauge from './MetricGauge'

const ALERT_ICONS = {
  stockout: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  low_stock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  planogram_violation: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  price_tag_error: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  unauthorized_product: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
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
            {alert.type?.replaceAll('_', ' ')}
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
