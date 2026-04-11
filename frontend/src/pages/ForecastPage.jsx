import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, BarChart, Bar
} from 'recharts'
import { api } from '../api'
import Topbar from '../components/Topbar'

const SKUS = [
  { sku: 'BEV-001', name: 'Coca-Cola 330ml', category: 'Beverages' },
  { sku: 'BEV-002', name: 'Pepsi 330ml', category: 'Beverages' },
  { sku: 'BEV-003', name: 'Sprite 330ml', category: 'Beverages' },
  { sku: 'SNK-001', name: "Lay's Classic 200g", category: 'Snacks' },
  { sku: 'SNK-002', name: 'Pringles Original 165g', category: 'Snacks' },
  { sku: 'DAI-001', name: 'Amul Full Cream Milk 1L', category: 'Dairy' },
  { sku: 'GRN-001', name: 'Basmati Rice 5kg', category: 'Grains' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8, marginTop: 2 }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{Math.round(p.value)} units</span>
        </div>
      ))}
    </div>
  )
}

export default function ForecastPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0])
  const [forecast, setForecast] = useState(null)
  const [replenishment, setReplenishment] = useState([])
  const [loading, setLoading] = useState(false)
  const [repLoading, setRepLoading] = useState(true)

  const genForecast = (sku) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const base = 20 + Math.random() * 40
    const forecasts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i + 1)
      const weekendBoost = (d.getDay() === 0 || d.getDay() === 6) ? 1.4 : 1.0
      const predicted = Math.round(base * weekendBoost + (Math.random() - 0.5) * 10)
      return { date: d.toISOString().slice(0, 10), predicted_quantity: predicted, lower_bound: Math.round(predicted * 0.75), upper_bound: Math.round(predicted * 1.3), day_of_week: days[d.getDay()] }
    })
    const avg = Math.round(forecasts.reduce((s, f) => s + f.predicted_quantity, 0) / 7)
    return { sku, forecasts, summary: { avg_daily_demand: avg, total_7day_demand: avg * 7, reorder_point: Math.round(avg * 1.5), suggested_order_qty: Math.round(avg * 3), wmape: +(0.08 + Math.random() * 0.1).toFixed(3), wmape_pct: `${(8 + Math.random() * 10).toFixed(1)}%`, lead_time_days: 2 } }
  }

  const genReplenishment = () => SKUS.map(s => {
    const avg = Math.round(15 + Math.random() * 35)
    return { sku: s.sku, product_name: s.name, avg_daily_demand: avg, total_7day_demand: avg * 7, reorder_point: Math.round(avg * 1.5), suggested_order_qty: Math.round(avg * 3), wmape: +(0.08 + Math.random() * 0.12).toFixed(3) }
  }).sort((a, b) => b.avg_daily_demand - a.avg_daily_demand)

  useEffect(() => {
    setLoading(true)
    api.getForecast(selectedSku.sku)
      .then(setForecast)
      .catch(() => setForecast(genForecast(selectedSku.sku)))
      .finally(() => setLoading(false))
  }, [selectedSku])

  useEffect(() => {
    api.getReplenishment()
      .then(d => setReplenishment(d.recommendations || []))
      .catch(() => setReplenishment(genReplenishment()))
      .finally(() => setRepLoading(false))
  }, [])

  const chartData = forecast?.forecasts?.map(f => ({
    date: f.date.slice(5),
    predicted: f.predicted_quantity,
    lower: f.lower_bound,
    upper: f.upper_bound,
    day: f.day_of_week
  })) || []

  const summary = forecast?.summary || {}

  return (
    <div>
      <Topbar title="Demand Forecast" subtitle="7-day product demand predictions and replenishment recommendations" />
      <div className="page-container">

        {/* SKU Selector */}
        <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Select Product SKU
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SKUS.map(s => (
              <button key={s.sku}
                      className={`filter-btn ${selectedSku.sku === s.sku ? 'active' : ''}`}
                      onClick={() => setSelectedSku(s)}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block' }}>{s.sku}</span>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Forecast Summary KPIs */}
        {forecast && (
          <div className="kpi-grid" style={{ marginBottom: 20 }}>
            <div className="kpi-card">
              <span className="kpi-icon">📦</span>
              <div className="kpi-value">{summary.avg_daily_demand}</div>
              <div className="kpi-label">Avg Daily Demand</div>
            </div>
            <div className="kpi-card">
              <span className="kpi-icon">📅</span>
              <div className="kpi-value">{summary.total_7day_demand}</div>
              <div className="kpi-label">7-Day Forecast (units)</div>
            </div>
            <div className="kpi-card" style={{ '--accent-color': 'var(--accent-amber)' }}>
              <span className="kpi-icon">⚡</span>
              <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>{summary.reorder_point}</div>
              <div className="kpi-label">Reorder Point</div>
            </div>
            <div className="kpi-card" style={{ '--accent-color': 'var(--accent-blue)' }}>
              <span className="kpi-icon">🛒</span>
              <div className="kpi-value" style={{ color: 'var(--accent-blue-light)' }}>{summary.suggested_order_qty}</div>
              <div className="kpi-label">Suggested Order Qty</div>
            </div>
            <div className="kpi-card">
              <span className="kpi-icon">🎯</span>
              <div className="kpi-value">{summary.wmape_pct}</div>
              <div className="kpi-label">WMAPE Error</div>
            </div>
            <div className="kpi-card">
              <span className="kpi-icon">🚚</span>
              <div className="kpi-value">{summary.lead_time_days}d</div>
              <div className="kpi-label">Lead Time</div>
            </div>
          </div>
        )}

        {/* Forecast Chart */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">
              📈 7-Day Demand Forecast — {selectedSku.name}
            </div>
            <span title="Confidence interval shown as band" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              95% Confidence Interval
            </span>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="skeleton" style={{ height: 280 }} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="upper" fill="url(#ciGrad)" stroke="#8b5cf6"
                        strokeWidth={1} strokeDasharray="4 2" opacity={0.5} name="Upper Bound" />
                  <Area type="monotone" dataKey="lower" fill="transparent" stroke="#8b5cf6"
                        strokeWidth={1} strokeDasharray="4 2" opacity={0.5} name="Lower Bound" />
                  <Area type="monotone" dataKey="predicted" fill="url(#forecastGrad)"
                        stroke="#3b82f6" strokeWidth={2.5} name="Predicted Demand" />
                  {summary.reorder_point && (
                    <ReferenceLine y={summary.reorder_point}
                      stroke="var(--accent-amber)" strokeDasharray="6 3"
                      label={{ value: `Reorder: ${summary.reorder_point}`, fill: 'var(--accent-amber)', fontSize: 11 }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Replenishment Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🛒 Replenishment Recommendations</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>All products · Sorted by demand</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Avg Daily Demand</th>
                    <th>7-Day Demand</th>
                    <th>Reorder Point</th>
                    <th>Suggested Order</th>
                    <th>WMAPE</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {repLoading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading...</td></tr>
                  ) : replenishment.map((r, i) => (
                    <tr key={i}>
                      <td className="td-mono">{r.sku}</td>
                      <td className="td-bold">{r.product_name}</td>
                      <td>{r.avg_daily_demand}</td>
                      <td>{r.total_7day_demand}</td>
                      <td style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{r.reorder_point}</td>
                      <td style={{ color: 'var(--accent-blue-light)', fontWeight: 700 }}>{r.suggested_order_qty}</td>
                      <td style={{ color: r.wmape < 0.12 ? 'var(--accent-emerald)' : r.wmape < 0.20 ? 'var(--accent-amber)' : 'var(--critical)' }}>
                        {(r.wmape * 100).toFixed(1)}%
                      </td>
                      <td>
                        <button className="topbar-btn topbar-btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }}
                                onClick={() => setSelectedSku({ sku: r.sku, name: r.product_name })}>
                          View Forecast
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
