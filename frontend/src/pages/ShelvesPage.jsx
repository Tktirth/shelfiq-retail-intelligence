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
        z: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 28, width: 700, maxHeight: '85vh',
          overflowY: 'auto', position: 'relative'
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
            {(shelf.detected_products || []).map((prod, i) => (
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
                padding: 2, transition: 'all 0.2s'
              }}>
                <div style={{ fontSize: 16 }}>
                  {prod.stock_level === 'full' ? '📦' : prod.stock_level === 'low' ? '⚠️' : '🚨'}
                </div>
                <div style={{ color: 'white', lineHeight: 1.2, marginTop: 2 }}>
                  {prod.name?.split(' ').slice(0, 2).join('\n')}
                </div>
                <div style={{ color: STOCK_COLORS[prod.stock_level], fontWeight: 700, marginTop: 2 }}>
                  {Math.round(prod.confidence * 100)}%
                </div>
              </div>
            ))}
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
    let intervalId;
    const fetchShelves = () => {
      api.getShelves()
        .then(setShelves)
        .catch(console.error)
        .finally(() => setLoading(false))
    };
    
    fetchShelves(); // initial load
    intervalId = setInterval(fetchShelves, 5000); // 5s live polling
    
    return () => clearInterval(intervalId); // cleanup
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
          <div className="card" style={{ marginBottom: 24, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="section-title">🔍 CV Analysis Result — {analysisResult.shelf_name}</div>
              <button onClick={() => setAnalysisResult(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <MetricGauge value={analysisResult.health_score} size={90} label="HEALTH" />
                <MetricGauge value={analysisResult.compliance_score} size={90} label="COMPLIANCE" />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Detected Products: {analysisResult.detected_products_count}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.entries(analysisResult.stock_summary || {}).map(([level, count]) => (
                    <div key={level} style={{
                      background: `${STOCK_LABEL_COLOR[level]}22`,
                      border: `1px solid ${STOCK_LABEL_COLOR[level]}`,
                      borderRadius: 8, padding: '6px 14px', fontSize: 12
                    }}>
                      <span style={{ color: STOCK_LABEL_COLOR[level], fontWeight: 700 }}>{count}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>{level}</span>
                    </div>
                  ))}
                </div>
                {uploadFile && (
                  <img src={URL.createObjectURL(uploadFile)} alt="Uploaded shelf"
                       style={{ marginTop: 12, maxHeight: 120, borderRadius: 8, opacity: 0.8 }} />
                )}
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
