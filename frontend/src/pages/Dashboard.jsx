import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAlerts } from '../hooks/useAlerts'
import Topbar from '../components/Topbar'
import ShelfMap from '../components/ShelfMap'
import AlertCard from '../components/AlertCard'
import MetricGauge from '../components/MetricGauge'

// Ticker messages
const TICKER_MSGS = [
  '🚨 Coca-Cola 330ml — Aisle A stockout detected  |  ',
  '⚠️ Amul Milk 1L — Dairy low stock (1 unit)  |  ',
  '📋 Aisle B planogram compliance: 72%  |  ',
  '📈 Weekend demand spike predicted: +40% for Beverages  |  ',
  '✅ Aisle D replenishment order placed: Basmati Rice 5kg (20 units)  |  ',
  '🎯 Revenue recovered today: ₹24,500  |  ',
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { alerts, liveAlerts, acknowledge } = useAlerts()
  const [kpis, setKpis] = useState(null)
  const [shelves, setShelves] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let intervalId;
    const fetchData = () => {
      Promise.all([api.getKPIs(), api.getShelves()])
        .then(([kpiData, shelvesData]) => {
          setKpis(kpiData)
          setShelves(shelvesData)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    };
    
    fetchData(); // Initial load
    intervalId = setInterval(fetchData, 5000); // Live realistic polling every 5s
    
    return () => clearInterval(intervalId); // Cleanup
  }, [])

  const recentAlerts = [...liveAlerts, ...alerts].slice(0, 5)
  const tickerText = TICKER_MSGS.join('  •  ')

  const formatCurrency = (v) => `₹${Number(v).toLocaleString()}`

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Real-time shelf intelligence overview">
        <button className="topbar-btn topbar-btn-ghost" onClick={() => window.location.reload()}>
          🔄 Refresh
        </button>
        <button className="topbar-btn topbar-btn-primary" onClick={() => navigate('/shelves')}>
          📷 Analyze Shelf
        </button>
      </Topbar>

      <div className="page-container">
        {/* Live ticker */}
        <div className="alert-ticker">
          <span className="ticker-label">🔴 LIVE</span>
          <div className="ticker-scroll">
            <span>{tickerText}{tickerText}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card" style={{ '--accent-color': 'var(--accent-emerald)' }}>
            <span className="kpi-icon">💰</span>
            <div className="kpi-value">{kpis ? formatCurrency(kpis.revenue_recovered_today) : '—'}</div>
            <div className="kpi-label">Revenue Recovered Today</div>
            <div className="kpi-trend up">↑ vs yesterday</div>
          </div>
          <div className="kpi-card" style={{ '--accent-color': 'var(--accent-blue)' }}>
            <span className="kpi-icon">🛡️</span>
            <div className="kpi-value">{kpis?.stockouts_prevented ?? '—'}</div>
            <div className="kpi-label">Stockouts Prevented</div>
            <div className="kpi-trend up">↑ 23% vs last week</div>
          </div>
          <div className="kpi-card" style={{ '--accent-color': 'var(--critical)' }}>
            <span className="kpi-icon">🚨</span>
            <div className="kpi-value" style={{ color: 'var(--critical)' }}>{kpis?.active_alerts ?? '—'}</div>
            <div className="kpi-label">Active Alerts</div>
            <div className="kpi-trend down" style={{ color: kpis?.active_alerts > 5 ? 'var(--critical)' : 'var(--accent-emerald)' }}>
              {kpis?.alerts_this_hour ?? 0} in last hour
            </div>
          </div>
          <div className="kpi-card" style={{ '--accent-color': 'var(--accent-purple)' }}>
            <span className="kpi-icon">📋</span>
            <div className="kpi-value">{kpis?.avg_compliance_score ?? '—'}%</div>
            <div className="kpi-label">Planogram Compliance</div>
            <div className="kpi-trend up">↑ 4.2% this week</div>
          </div>
          <div className="kpi-card" style={{ '--accent-color': 'var(--accent-cyan)' }}>
            <span className="kpi-icon">🗄️</span>
            <div className="kpi-value">{kpis?.avg_health_score ?? '—'}%</div>
            <div className="kpi-label">Avg Shelf Health</div>
            <div className="kpi-trend up">↑ 2.1% today</div>
          </div>
          <div className="kpi-card" style={{ '--accent-color': 'var(--accent-amber)' }}>
            <span className="kpi-icon">🎯</span>
            <div className="kpi-value">{kpis?.forecast_accuracy ?? '—'}%</div>
            <div className="kpi-label">Forecast Accuracy</div>
            <div className="kpi-trend up">WMAPE: 11.3%</div>
          </div>
        </div>

        {/* Two column: map + alerts */}
        <div className="grid-2-1" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">🏪 Store Floor Map</div>
              <span className="badge badge-active" style={{ fontSize: 10 }}>Live</span>
            </div>
            <div className="card-body">
              <ShelfMap shelves={shelves} onAisleClick={(aisle) => navigate('/shelves')} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">🚨 Live Alerts</div>
              <button
                className="topbar-btn topbar-btn-ghost"
                style={{ fontSize: 11 }}
                onClick={() => navigate('/alerts')}
              >View All</button>
            </div>
            <div className="card-body">
              {recentAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <div>No active alerts</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentAlerts.slice(0, 5).map((alert, i) => (
                    <AlertCard key={alert.id || i} alert={alert} onAcknowledge={acknowledge} compact />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shelf Health Grid */}
        <div className="section-header">
          <div>
            <div className="section-title">🗄️ Shelf Health Overview</div>
            <div className="section-subtitle">{shelves.length} shelves monitored · Updated live</div>
          </div>
          <button className="topbar-btn topbar-btn-ghost" onClick={() => navigate('/shelves')}>
            View All Shelves →
          </button>
        </div>

        <div className="shelf-grid">
          {loading
            ? Array(6).fill(0).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 180 }} />
              ))
            : shelves.slice(0, 6).map(shelf => {
                const health = shelf.health_score || 0
                const compliance = shelf.compliance_score || 0
                const stockColor = health >= 80 ? 'var(--accent-emerald)' : health >= 60 ? 'var(--accent-amber)' : 'var(--critical)'
                const total = (shelf.stock_summary?.full || 0) + (shelf.stock_summary?.low || 0) + (shelf.stock_summary?.empty || 0)
                return (
                  <div
                    key={shelf.id}
                    className="shelf-card"
                    style={{ '--status-color': stockColor }}
                    onClick={() => navigate('/shelves')}
                  >
                    <div className="shelf-card-header">
                      <div>
                        <div className="shelf-name">{shelf.name}</div>
                        <div className="shelf-category">{shelf.category}</div>
                      </div>
                      {shelf.violations_count > 0 && (
                        <span className="badge badge-critical">{shelf.violations_count} issues</span>
                      )}
                    </div>

                    <div className="shelf-scores">
                      <div className="score-item">
                        <div className="score-value" style={{ color: stockColor }}>{Math.round(health)}</div>
                        <div className="score-label">Health %</div>
                      </div>
                      <div className="score-item">
                        <div className="score-value" style={{ color: compliance >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                          {Math.round(compliance)}
                        </div>
                        <div className="score-label">Compliance %</div>
                      </div>
                    </div>

                    {total > 0 && (
                      <>
                        <div className="stock-bar">
                          <div className="stock-bar-full"
                               style={{ width: `${((shelf.stock_summary?.full || 0) / total) * 100}%` }} />
                          <div className="stock-bar-low"
                               style={{ width: `${((shelf.stock_summary?.low || 0) / total) * 100}%` }} />
                          <div className="stock-bar-empty"
                               style={{ width: `${((shelf.stock_summary?.empty || 0) / total) * 100}%` }} />
                        </div>
                        <div className="stock-labels">
                          <span>
                            <span className="stock-dot" style={{ background: 'var(--accent-emerald)' }} />
                            {shelf.stock_summary?.full || 0} Full
                          </span>
                          <span>
                            <span className="stock-dot" style={{ background: 'var(--accent-amber)' }} />
                            {shelf.stock_summary?.low || 0} Low
                          </span>
                          <span>
                            <span className="stock-dot" style={{ background: 'var(--critical)' }} />
                            {shelf.stock_summary?.empty || 0} Empty
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
        </div>
      </div>
    </div>
  )
}
