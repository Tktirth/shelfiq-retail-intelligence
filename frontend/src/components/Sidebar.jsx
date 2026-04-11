import { useLocation, Link } from 'react-router-dom'
import { useAlerts } from '../hooks/useAlerts'

const NAV_ITEMS = [
  { path: '/dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>, label: 'Dashboard' },
  { path: '/shelves', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect px="0" py="0" width="20" height="8" x="2" y="3" rx="2"/><rect px="0" py="0" width="20" height="8" x="2" y="13" rx="2"/><path d="M6 7h.01"/><path d="M6 17h.01"/></svg>, label: 'Shelf Monitor' },
  { path: '/alerts', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>, label: 'Alerts', badge: true },
  { path: '/forecast', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>, label: 'Demand Forecast' },
  { path: '/analytics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>, label: 'Analytics' },
]

export default function Sidebar() {
  const location = useLocation()
  const { totalActive, connected } = useAlerts()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {/* High-end Premium SVG logo mark: Neural Prism */}
        <div className="sidebar-logo-icon" style={{ background: 'none', padding: 0, overflow: 'visible', boxShadow: 'none' }}>
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="prismGrad" x1="0" y1="0" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer Hexagon frame */}
            <path d="M21 4 L36 12.5 V29.5 L21 38 L6 29.5 V12.5 L21 4Z" stroke="url(#prismGrad)" strokeWidth="2.5" fill="none" style={{ filter: 'url(#glow)' }} />
            {/* Shelf Lines / Prism facets */}
            <path d="M10 15 H32" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            <path d="M8 21 H34" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            <path d="M10 27 H32" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
            {/* Central Intelligence Core */}
            <circle cx="21" cy="21" r="5" fill="url(#prismGrad)" />
            <circle cx="21" cy="21" r="2" fill="white" />
            {/* Scanning Beams */}
            <path d="M21 16 V10 M21 26 V32" stroke="url(#prismGrad)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          </svg>
        </div>
        <div className="sidebar-logo-text">
          <h2 style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.8px', background: 'linear-gradient(135deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ShelfIQ</h2>
          <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', opacity: 0.8 }}>Infinite Vision • Zero Blindspots</span>
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
        <div style={{ marginTop: 8, fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 500 }}>
          Neural Hub • Active Intelligence v4.2
        </div>
      </div>
    </aside>
  )
}
