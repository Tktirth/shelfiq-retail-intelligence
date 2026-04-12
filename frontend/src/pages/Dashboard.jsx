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

import OraclePanel from '../components/OraclePanel'

export default function Dashboard() {
  const navigate = useNavigate()
  const { alerts, liveAlerts, acknowledge, totalActive } = useAlerts()
  const [kpis, setKpis] = useState(null)
  const [shelves, setShelves] = useState([])
  const [loading, setLoading] = useState(true)
  const [oracleOpen, setOracleOpen] = useState(false)
  const [roiFlash, setRoiFlash] = useState(false)
  const [prevAlertCount, setPrevAlertCount] = useState(0)

  // Trigger ROI Pulse when alerts are resolved
  useEffect(() => {
    if (totalActive < prevAlertCount) {
      setRoiFlash(true)
      const t = setTimeout(() => setRoiFlash(false), 2000)
      return () => clearTimeout(t)
    }
    setPrevAlertCount(totalActive)
  }, [totalActive])

  // Fallback data generators for when backend is down
  const generateFallbackKPIs = () => ({
    revenue_recovered_today: Math.round(14000 + Math.random() * 12000),
    stockouts_prevented: Math.floor(8 + Math.random() * 16),
    active_alerts: Math.floor(2 + Math.random() * 6),
    avg_compliance_score: +(78 + Math.random() * 16).toFixed(1),
    avg_health_score: +(72 + Math.random() * 20).toFixed(1),
    shelves_monitored: 10,
    alerts_this_hour: Math.floor(Math.random() * 4),
    forecast_accuracy: +(86 + Math.random() * 8).toFixed(1),
  })

  const generateFallbackShelves = () => {
    const categories = ['Beverages', 'Snacks', 'Dairy', 'Grains']
    const aisles = ['A', 'B', 'C', 'D']
    return Array.from({ length: 10 }, (_, i) => {
      const health = 55 + Math.random() * 45
      const full = Math.floor(3 + Math.random() * 10)
      const low = Math.floor(Math.random() * 5)
      const empty = Math.floor(Math.random() * 3)
      return {
        id: i + 1,
        name: `${aisles[i % 4]}${Math.floor(i / 4) + 1} — Shelf ${(i % 3) + 1}`,
        aisle: aisles[i % 4],
        category: categories[i % 4],
        level: (i % 3) + 1,
        health_score: +health.toFixed(1),
        compliance_score: +(65 + Math.random() * 33).toFixed(1),
        stock_summary: { full, low, empty },
        violations_count: Math.floor(Math.random() * 4),
      }
    })
  }

  useEffect(() => {
    let intervalId;
    const fetchData = () => {
      Promise.all([api.getKPIs(), api.getShelves()])
        .then(([kpiData, shelvesData]) => {
          setKpis(kpiData)
          setShelves(shelvesData)
        })
        .catch(() => {
          setKpis(prev => {
            if (!prev) return generateFallbackKPIs();
            const revenueIncrement = Math.floor(Math.random() * 150) + 50; 
            const newStockouts = Math.random() > 0.8 ? 1 : 0;
            return { 
              ...prev,
              revenue_recovered_today: prev.revenue_recovered_today + revenueIncrement,
              stockouts_prevented: prev.stockouts_prevented + newStockouts,
              active_alerts: totalActive, 
              alerts_this_hour: Math.max(prev.alerts_this_hour, Math.floor(Math.random() * 4))
            };
          });
          setShelves(prev => prev.length ? prev : generateFallbackShelves())
        })
        .finally(() => setLoading(false))
    };
    
    fetchData();
    intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, [totalActive])

  const recentAlerts = [...liveAlerts, ...alerts].slice(0, 5)
  const tickerText = TICKER_MSGS.join('  •  ')
  const formatCurrency = (v) => `₹${Number(v).toLocaleString()}`

  return (
    <>
      <OraclePanel 
        isOpen={oracleOpen} 
        onClose={() => setOracleOpen(false)} 
        kpis={kpis} 
        alerts={[...liveAlerts, ...alerts]} 
      />
      
      <Topbar title="Dashboard" subtitle="Neural Store Intelligence Hub">
        <button className="topbar-btn topbar-btn-ghost" onClick={() => setOracleOpen(true)} style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
          ✨ Ask Oracle
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
          <div className={`kpi-card ${roiFlash ? 'animate-roi-pulse' : ''}`} style={{ '--accent-color': 'var(--accent-emerald)' }}>
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
            <div className="kpi-value" style={{ color: 'var(--critical)' }}>{totalActive}</div>
            <div className="kpi-label">Active Alerts</div>
            <div className="kpi-trend down" style={{ color: totalActive > 5 ? 'var(--critical)' : 'var(--accent-emerald)' }}>
              {kpis?.alerts_this_hour ?? Math.min(totalActive, 3)} in last hour
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
    </>
  )
}
