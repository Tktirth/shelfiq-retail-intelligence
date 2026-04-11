export default function Topbar({ title, subtitle, children }) {
  return (
    <div className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-actions">
        {children}
      </div>
    </div>
  )
}
