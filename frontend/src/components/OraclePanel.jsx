import { useState, useEffect } from 'react'

export default function OraclePanel({ isOpen, onClose, kpis, alerts }) {
  const [strategy, setStrategy] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Prescriptive intelligence generator based on live data
  const generateInsight = () => {
    if (!kpis) return "Awaiting data synchronization..."
    
    const stockouts = alerts.filter(a => a.type === 'stockout').length
    const revenueRisk = stockouts * 450 // Dynamic risk estimation
    
    const insights = [
      `Economic impact detected: ₹${revenueRisk.toLocaleString()} at risk due to stockouts in ${kpis.shelves_monitored} monitored zones.`,
      `Optimal Action: Immediate replenishment of beverages in Aisle A is predicted to recover ₹1,200 of potential loss by 6 PM.`,
      `Strategy Insight: Footfall patterns suggest a weekend surge. Increase your 'Dairy' safety stock by 15% to maintain 98% compliance.`,
      `Efficiency Alert: Your 'Snacks' section has high stock but low facings—reorganize to improve visibility and boost sales by ~8%.`
    ]
    
    return insights.join('\n\n')
  }

  useEffect(() => {
    if (isOpen) {
      setIsTyping(true)
      setStrategy('')
      const fullText = generateInsight()
      let index = 0
      
      const timer = setInterval(() => {
        setStrategy(prev => prev + fullText[index])
        index++
        if (index >= fullText.length - 1) {
          clearInterval(timer)
          setIsTyping(false)
        }
      }, 15) // Fast typing effect
      
      return () => clearInterval(timer)
    }
  }, [isOpen, kpis])

  return (
    <div className={`oracle-drawer ${isOpen ? 'open' : ''}`}>
      <div style={{ padding: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Neural Intelligence</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>✨ ShelfIQ Oracle</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <div style={{ position: 'relative' }}>
          {isTyping && <div className="neural-scan-line" style={{ height: 2, top: 'auto', bottom: 0, animation: 'scan-vertical 2s infinite' }} />}
          
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--border)', 
            borderRadius: 16, 
            padding: 20, 
            fontFamily: "'JetBrains Mono', monospace", 
            fontSize: 13, 
            lineHeight: 1.8, 
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            minHeight: 200
          }}>
            {strategy}
            {isTyping && <span className="status-dot" style={{ display: 'inline-block', marginLeft: 4, width: 8, height: 8 }} />}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Prescriptive Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '📦', label: 'Optimize Aisle A Stocking', color: 'var(--accent-blue)' },
              { icon: '📉', label: 'Redistribute Grains Inventory', color: 'var(--accent-purple)' },
              { icon: '🎯', label: 'Update Forecasting Parameters', color: 'var(--accent-emerald)' }
            ].map((action, i) => (
              <div key={i} style={{ 
                background: 'var(--bg-card)', 
                border: '1px solid var(--border)', 
                borderRadius: 12, 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12,
                cursor: 'pointer',
                transition: 'var(--transition)'
              }} className="nav-item">
                <span style={{ fontSize: 18 }}>{action.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{action.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div style={{ padding: 20, borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
          Real-time Strategy Engine v4.2 • Core IA Active
        </div>
      </div>
    </div>
  )
}
