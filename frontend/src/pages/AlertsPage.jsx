import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAlerts } from '../hooks/useAlerts'
import Topbar from '../components/Topbar'
import AlertCard from '../components/AlertCard'

const FILTER_TYPES = ['all', 'stockout', 'low_stock', 'planogram_violation', 'price_tag_error']
const FILTER_STATUS = ['all', 'active', 'acknowledged']

export default function AlertsPage() {
  const { alerts, acknowledge } = useAlerts()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [simulating, setSimulating] = useState(false)

  const filtered = alerts.filter(a => {
    const typeOk = typeFilter === 'all' || a.type === typeFilter
    const statusOk = statusFilter === 'all' || a.status === statusFilter
    return typeOk && statusOk
  })

  const simulateAlert = async (type) => {
    setSimulating(true)
    await api.simulateAlert(type).catch(console.error)
    setTimeout(() => setSimulating(false), 1000)
  }

  const counts = {
    critical: alerts.filter(a => a.priority === 'critical' && a.status === 'active').length,
    high: alerts.filter(a => a.priority === 'high' && a.status === 'active').length,
    active: alerts.filter(a => a.status === 'active').length,
    total: alerts.length
  }

  return (
    <div>
      <Topbar title="Alert Center" subtitle="Real-time shelf alerts and notifications">
        <button
          className="topbar-btn topbar-btn-ghost"
          onClick={() => simulateAlert('stockout')}
          disabled={simulating}
        >
          {simulating ? '⏳' : '⚡'} Sim Stockout
        </button>
        <button
          className="topbar-btn topbar-btn-ghost"
          onClick={() => simulateAlert('planogram')}
          disabled={simulating}
        >
          📋 Sim Planogram
        </button>
        <button
          className="topbar-btn topbar-btn-primary"
          onClick={() => simulateAlert('low_stock')}
          disabled={simulating}
        >
          ⚠️ Sim Low Stock
        </button>
      </Topbar>

      <div className="page-container">
        {/* Summary stats */}
        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          <div className="kpi-card" style={{ '--accent-color': 'var(--critical)' }}>
            <span className="kpi-icon">🔴</span>
            <div className="kpi-value" style={{ color: 'var(--critical)' }}>{counts.critical}</div>
            <div className="kpi-label">Critical Active</div>
          </div>
          <div className="kpi-card" style={{ '--accent-color': 'var(--high)' }}>
            <span className="kpi-icon">🟠</span>
            <div className="kpi-value" style={{ color: 'var(--high)' }}>{counts.high}</div>
            <div className="kpi-label">High Priority</div>
          </div>
          <div className="kpi-card" style={{ '--accent-color': 'var(--accent-blue)' }}>
            <span className="kpi-icon">📊</span>
            <div className="kpi-value">{counts.active}</div>
            <div className="kpi-label">Total Active</div>
          </div>
          <div className="kpi-card" style={{ '--accent-color': 'var(--accent-purple)' }}>
            <span className="kpi-icon">📝</span>
            <div className="kpi-value">{counts.total}</div>
            <div className="kpi-label">Total Alerts</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alert Type</div>
              <div className="filters">
                {FILTER_TYPES.map(t => (
                  <button key={t} className={`filter-btn ${typeFilter === t ? 'active' : ''}`}
                          onClick={() => setTypeFilter(t)}>
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
              <div className="filters">
                {FILTER_STATUS.map(s => (
                  <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
                          onClick={() => setStatusFilter(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alert list */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Showing {filtered.length} alerts
          {typeFilter !== 'all' && ` · Type: ${typeFilter.replace('_', ' ')}`}
          {statusFilter !== 'all' && ` · Status: ${statusFilter}`}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>No alerts found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>All shelves are operating normally</div>
            </div>
          ) : (
            filtered.map((alert, i) => (
              <AlertCard key={alert.id || i} alert={alert} onAcknowledge={acknowledge} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
