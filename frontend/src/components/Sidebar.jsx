import { useLocation, Link } from 'react-router-dom'
import { useAlerts } from '../hooks/useAlerts'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { path: '/shelves', icon: '🗄️', label: 'Shelf Monitor' },
  { path: '/alerts', icon: '🚨', label: 'Alerts', badge: true },
  { path: '/forecast', icon: '📈', label: 'Demand Forecast' },
  { path: '/analytics', icon: '📊', label: 'Analytics' },
]

export default function Sidebar() {
  const location = useLocation()
  const { totalActive, connected } = useAlerts()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {/* Custom SVG logo mark */}
        <div className="sidebar-logo-icon" style={{ background: 'none', padding: 0, overflow: 'visible', boxShadow: 'none' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="shelfGrad" x1="0" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            {/* Background rounded square */}
            <rect width="40" height="40" rx="10" fill="url(#logoGrad)" />
            {/* Shelf bars */}
            <rect x="7" y="28" width="26" height="3" rx="1.5" fill="white" opacity="0.9" />
            <rect x="7" y="20" width="26" height="3" rx="1.5" fill="white" opacity="0.65" />
            <rect x="7" y="12" width="26" height="3" rx="1.5" fill="white" opacity="0.4" />
            {/* CV scan circle */}
            <circle cx="20" cy="20" r="7" stroke="url(#shelfGrad)" strokeWidth="2" fill="none" opacity="0.9" />
            {/* Center dot */}
            <circle cx="20" cy="20" r="2.5" fill="white" opacity="0.95" />
            {/* Corner scan brackets */}
            <path d="M10 16 L10 10 L16 10" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
            <path d="M30 16 L30 10 L24 10" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <h2 style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ShelfIQ</h2>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.2px' }}>See every shelf. Miss nothing.</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge && totalActive > 0 && (
              <span className="nav-badge">{totalActive}</span>
            )}
          </Link>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Store Info</div>
        <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>SuperMart Ahmedabad</div>
          <div>SG Highway Branch</div>
          <div>10 Shelves · 4 Aisles</div>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className={`status-dot ${connected ? '' : 'disconnected'}`}
               style={{ background: connected ? 'var(--accent-emerald)' : 'var(--accent-amber)' }} />
          <span>{connected ? 'Live Feed Connected' : 'Connecting...'}</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
          Demo Mode · YOLOv8 + Prophet
        </div>
      </div>
    </aside>
  )
}
