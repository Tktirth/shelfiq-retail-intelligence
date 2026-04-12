import { useState, useEffect } from 'react'
import { api } from '../api'
import Topbar from '../components/Topbar'
import MetricGauge from '../components/MetricGauge'

const STOCK_COLORS = {
  full: 'var(--accent-emerald)',
  low: 'var(--accent-amber)',
  empty: 'var(--critical)'
}

function ShelfDetailModal({ shelf, onClose }) {
  if (!shelf) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(4px)',
        overflowY: 'auto', padding: '20px 0'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 28, width: 700, maxHeight: '85vh',
          overflowY: 'auto', position: 'relative',
          overscrollBehavior: 'contain', margin: 'auto'
        }}
        className="animate-scale-in"
      >
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '4px 10px', color: 'var(--text-secondary)',
          cursor: 'pointer', fontSize: 16
        }}>✕</button>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{shelf.name}</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          {shelf.category} · Level {shelf.level} · {new Date(shelf.last_analyzed).toLocaleTimeString()}
        </p>

        {/* Scores */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24, justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <MetricGauge value={shelf.health_score} size={110} label="HEALTH" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <MetricGauge value={shelf.compliance_score} size={110} label="COMPLIANCE" color="var(--accent-purple)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <MetricGauge value={shelf.facing_accuracy || 85} size={110} label="FACINGS" color="var(--accent-cyan)" />
          </div>
        </div>

        {/* Visual shelf representation */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            📦 Detected Products on Shelf
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: 16, position: 'relative', height: 100, overflow: 'hidden'
          }}>
            {/* Shelf board */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
              background: 'rgba(255,255,255,0.15)', borderRadius: 2
            }} />
            {(shelf.detected_products || []).map((prod, i) => {
              const profitAtRisk = prod.stock_level === 'empty' ? (prod.price || 45) * 5 : prod.stock_level === 'low' ? (prod.price || 45) * 2 : 0;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${(prod.position_x || 0) * 100}%`,
                  bottom: 8,
                  width: 50, height: 70,
                  background: STOCK_COLORS[prod.stock_level] + '22',
                  border: `2px solid ${STOCK_COLORS[prod.stock_level] || 'var(--border)'}`,
                  borderRadius: 6,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 8, textAlign: 'center',
                  padding: 2, transition: 'all 0.2s',
                  boxShadow: profitAtRisk > 0 ? `0 0 15px ${STOCK_COLORS[prod.stock_level]}` : 'none'
                }} className="nav-item">
                  <div style={{ fontSize: 16 }}>
                    {prod.stock_level === 'full' ? '📦' : prod.stock_level === 'low' ? '⚠️' : '🚨'}
                  </div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 7, lineHeight: 1.1, marginTop: 2 }}>
                    {prod.name?.split(' ').slice(0, 2).join('\n') || 'Product'}
                  </div>
                  {profitAtRisk > 0 && (
                    <div style={{ position: 'absolute', top: -18, background: 'var(--critical)', color: 'white', padding: '1px 4px', borderRadius: 4, fontStyle: 'normal', fontWeight: 800, fontSize: 7 }}>
                      -₹{profitAtRisk}
                    </div>
                  )}
                  <div style={{ color: STOCK_COLORS[prod.stock_level], fontWeight: 700, marginTop: 2 }}>
                    {Math.round((prod.confidence || 0) * 100)}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Violations */}
        {shelf.violations?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              ⚠️ Violations ({shelf.violations.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shelf.violations.map((v, i) => (
                <div key={i} style={{
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v.description}</span>
                    <span className={`badge badge-${v.severity || 'medium'}`}>{v.severity || 'medium'}</span>
                  </div>
                  {v.suggested_action && (
                    <div style={{ color: 'var(--accent-blue-light)', fontSize: 11, marginTop: 4 }}>
                      💡 {v.suggested_action}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {shelf.recommendations?.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              💡 Recommendations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shelf.recommendations.map((r, i) => (
                <div key={i} style={{
                  background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)'
                }}>
                  • {r}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ShelvesPage() {
  const [shelves, setShelves] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedShelf, setSelectedShelf] = useState(null)
  const [shelfDetail, setShelfDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [filter, setFilter] = useState('all')
  const [uploadFile, setUploadFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  useEffect(() => {
    const genShelves = () => {
      const categories = ['Beverages', 'Snacks', 'Dairy', 'Grains']
      const aisles = ['A', 'B', 'C', 'D']
      const names = ['Coca-Cola Shelf', 'Lay\'s Chips Display', 'Amul Dairy Rack', 'Basmati Rice Bay',
                     'Pepsi Zone', 'Pringles Section', 'Milk Corner', 'Flour \u0026 Grains',
                     'Energy Drinks', 'Biscuits \u0026 Cookies']
      return Array.from({ length: 10 }, (_, i) => {
        const health = 50 + Math.random() * 50
        const full = Math.floor(4 + Math.random() * 10)
        const low = Math.floor(Math.random() * 5)
        const empty = Math.floor(Math.random() * 3)
        return {
          id: i + 1, name: names[i], aisle: aisles[i % 4], category: categories[i % 4],
          level: (i % 3) + 1, health_score: +health.toFixed(1),
          compliance_score: +(60 + Math.random() * 38).toFixed(1),
          stock_summary: { full, low, empty },
          violations_count: Math.floor(Math.random() * 4),
          last_analyzed: new Date().toISOString(),
          detected_products: Array.from({ length: full + low + empty }, (_, j) => ({
            sku: `SKU-${1000 + j}`, name: 'Product', confidence: +(0.7 + Math.random() * 0.3).toFixed(2),
            stock_level: j < full ? 'full' : j < full + low ? 'low' : 'empty',
            facings: 1 + Math.floor(Math.random() * 4),
            position_x: +(j / (full + low + empty)).toFixed(3), position_y: 0.5,
            bbox: [0, 0, 0.1, 0.1]
          }))
        }
      })
    }
    let intervalId;
    const fetchShelves = () => {
      api.getShelves()
        .then(setShelves)
        .catch(() => {
          setShelves(prev => prev.length ? prev : genShelves())
        })
        .finally(() => setLoading(false))
    };
    
    fetchShelves();
    intervalId = setInterval(fetchShelves, 5000);
    
    return () => clearInterval(intervalId);
  }, [])

  const openShelf = async (shelf) => {
    setSelectedShelf(shelf)
    setLoadingDetail(true)
    try {
      const detail = await api.getShelf(shelf.id)
      setShelfDetail(detail)
    } catch (e) {
      setShelfDetail(shelf)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const result = await api.analyzeShelf(1, uploadFile)
      setAnalysisResult(result)
    } catch {}
    setAnalyzing(false)
  }

  const filtered = shelves.filter(s => {
    if (filter === 'all') return true
    if (filter === 'critical') return s.health_score < 60
    if (filter === 'low') return s.health_score >= 60 && s.health_score < 80
    if (filter === 'good') return s.health_score >= 80
    if (filter === 'violations') return s.violations_count > 0
    return true
  })

  const STOCK_LABEL_COLOR = { full: 'var(--accent-emerald)', low: 'var(--accent-amber)', empty: 'var(--critical)' }

  return (
    <div>
      <Topbar title="Shelf Monitor" subtitle="Real-time shelf analysis and planogram compliance">
        <label className="topbar-btn topbar-btn-ghost" style={{ cursor: 'pointer' }}>
          📤 Upload Shelf Image
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => setUploadFile(e.target.files[0])} />
        </label>
        {uploadFile && (
          <button className="topbar-btn topbar-btn-primary" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? '⏳ Analyzing...' : '🔍 Run Analysis'}
          </button>
        )}
      </Topbar>

      <div className="page-container">
        {/* Upload Analysis Result */}
        {analysisResult && (
          <div className="card" style={{ marginBottom: 24, padding: 24, border: '1px solid var(--accent-blue)', background: 'linear-gradient(180deg, var(--bg-card), rgba(59, 130, 246, 0.05))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="section-title" style={{ color: 'var(--accent-blue-light)' }}>
                🧬 Intelligent Shelf Analysis Complete — {analysisResult.shelf_name}
              </div>
              <button onClick={() => setAnalysisResult(null)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: 32 }}>
              <div style={{ display: 'flex', gap: 20 }}>
                <MetricGauge value={analysisResult.health_score} size={100} label="HEALTH" />
                <MetricGauge value={analysisResult.compliance_score || 85} size={100} label="COMPLY" color="var(--accent-purple)" />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>📋 Detected Inventory Summary</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="results-table-container" style={{ maxHeight: 250, overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '8px 4px' }}>Product</th>
                          <th style={{ padding: '8px 4px' }}>Qty</th>
                          <th style={{ padding: '8px 4px' }}>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(
                          (analysisResult.detected_products || []).reduce((acc, p) => {
                            if (!acc[p.sku]) acc[p.sku] = { ...p, count: 0 };
                            acc[p.sku].count += 1;
                            return acc;
                          }, {})
                        ).map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '10px 4px', fontWeight: 600 }}>{p.name}</td>
                            <td style={{ padding: '10px 4px' }}>
                              <span className="badge badge-low" style={{ padding: '2px 8px', fontSize: 10 }}>{p.count} units</span>
                            </td>
                            <td style={{ padding: '10px 4px', color: 'var(--accent-emerald)' }}>₹{p.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {uploadFile && (
                      <img src={URL.createObjectURL(uploadFile)} alt="Analysis Preview"
                           style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, border: '2px solid var(--border)' }} />
                    )}
                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                      Processed in {Math.round(analysisResult.processing_time_ms)}ms
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters" style={{ marginBottom: 20 }}>
          {['all', 'good', 'low', 'critical', 'violations'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}>
              {f === 'all' ? '📋 All Shelves' :
               f === 'good' ? '✅ Good (≥80%)' :
               f === 'low' ? '⚠️ Low (60-80%)' :
               f === 'critical' ? '🚨 Critical (<60%)' :
               '❌ Has Violations'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            {filtered.length} of {shelves.length} shelves
          </span>
        </div>

        {/* Compliance Summary per Aisle */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {['A', 'B', 'C', 'D'].map(aisle => {
            const aisleCategory = { A: 'Beverages', B: 'Snacks', C: 'Dairy', D: 'Grains' }
            const aisleShelves = shelves.filter(s => s.aisle === aisle)
            const avgHealth = aisleShelves.length
              ? aisleShelves.reduce((s, a) => s + (a.health_score || 0), 0) / aisleShelves.length
              : 0
            const avgCompliance = aisleShelves.length
              ? aisleShelves.reduce((s, a) => s + (a.compliance_score || 0), 0) / aisleShelves.length
              : 0
            return (
              <div key={aisle} className="kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Aisle {aisle}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{aisleCategory[aisle]}</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <MetricGauge value={avgHealth} size={70} label="HEALTH" />
                  <MetricGauge value={avgCompliance} size={70} label="COMPLY" color="var(--accent-purple)" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Shelf Grid */}
        {loading ? (
          <div className="shelf-grid">
            {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 200 }} />)}
          </div>
        ) : (
          <div className="shelf-grid">
            {filtered.map(shelf => {
              const health = shelf.health_score || 0
              const sc = health >= 80 ? 'var(--accent-emerald)' : health >= 60 ? 'var(--accent-amber)' : 'var(--critical)'
              const total = (shelf.stock_summary?.full || 0) + (shelf.stock_summary?.low || 0) + (shelf.stock_summary?.empty || 0)
              return (
                <div key={shelf.id} className="shelf-card" style={{ '--status-color': sc }}
                     onClick={() => openShelf(shelf)}>
                  <div className="shelf-card-header">
                    <div>
                      <div className="shelf-name">{shelf.name}</div>
                      <div className="shelf-category">{shelf.category}</div>
                    </div>
                    {shelf.violations_count > 0
                      ? <span className="badge badge-critical">⚠ {shelf.violations_count}</span>
                      : <span className="badge badge-low">✓ OK</span>}
                  </div>

                  <div className="shelf-scores">
                    <div className="score-item">
                      <div className="score-value" style={{ color: sc }}>{Math.round(health)}</div>
                      <div className="score-label">Health %</div>
                    </div>
                    <div className="score-item">
                      <div className="score-value"
                           style={{ color: shelf.compliance_score >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        {Math.round(shelf.compliance_score || 0)}
                      </div>
                      <div className="score-label">Compliance %</div>
                    </div>
                  </div>

                  {total > 0 && (
                    <>
                      <div className="stock-bar">
                        <div className="stock-bar-full" style={{ width: `${((shelf.stock_summary?.full || 0) / total) * 100}%` }} />
                        <div className="stock-bar-low" style={{ width: `${((shelf.stock_summary?.low || 0) / total) * 100}%` }} />
                        <div className="stock-bar-empty" style={{ width: `${((shelf.stock_summary?.empty || 0) / total) * 100}%` }} />
                      </div>
                      <div className="stock-labels">
                        <span><span className="stock-dot" style={{ background: 'var(--accent-emerald)' }} />{shelf.stock_summary?.full || 0}</span>
                        <span><span className="stock-dot" style={{ background: 'var(--accent-amber)' }} />{shelf.stock_summary?.low || 0}</span>
                        <span><span className="stock-dot" style={{ background: 'var(--critical)' }} />{shelf.stock_summary?.empty || 0}</span>
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                    Click to view details →
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Detail Modal */}
        <ShelfDetailModal
          shelf={loadingDetail ? null : shelfDetail}
          onClose={() => { setSelectedShelf(null); setShelfDetail(null) }}
        />
      </div>
    </div>
  )
}
