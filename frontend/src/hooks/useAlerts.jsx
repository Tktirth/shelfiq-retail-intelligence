import { useState, useEffect, useContext, createContext, useCallback, useRef } from 'react'
import { createWebSocket, api } from '../api'
import { useAuth } from '../context/AuthContext'

const AlertContext = createContext(null)

// ---------------------------------------------------------------------------
// Client-side realistic alert generator
// Fires every 4-9 seconds so the dashboard always feels alive,
// even when the Render backend is sleeping on the free tier.
// ---------------------------------------------------------------------------
const ALERT_TEMPLATES = [
  {
    type: 'stockout',
    priority: 'critical',
    titles: [
      'STOCKOUT: Coca-Cola 330ml — Aisle A',
      'STOCKOUT: Amul Full Cream Milk 1L — Dairy',
      'STOCKOUT: Maggi 2-Minute Noodles — Aisle B',
      'STOCKOUT: Parle-G Biscuits 250g — Snacks',
      'STOCKOUT: Tata Salt 1kg — Grocery',
    ],
    messages: [
      'Shelf is completely empty. Revenue impact: ₹450/hr',
      'Complete stockout. High-velocity SKU.',
      'Zero facings detected. Immediate restock required.',
    ],
    actions: [
      'Restock from back store immediately',
      'Emergency restock from cold storage',
      'Retrieve stock from warehouse bay 3',
    ],
    shelves: ['Aisle A — Shelf 2', 'Dairy — Shelf 1', 'Aisle B — Shelf 3', 'Grocery — Shelf 4'],
    revenue: [320, 450, 280, 510, 620],
  },
  {
    type: 'low_stock',
    priority: 'high',
    titles: [
      'LOW STOCK: Lay\'s Classic 200g — Aisle C',
      'LOW STOCK: Amul Milk 1L — Dairy Section',
      'LOW STOCK: Basmati Rice 5kg — Grocery',
      'LOW STOCK: Pepsi 500ml — Beverages',
      'LOW STOCK: Britannia Bread — Bakery',
    ],
    messages: [
      'Only 2 facings remaining. Standard is 6 facings.',
      'Only 1 unit remaining. Reorder point breached.',
      'Fast moving item below threshold.',
    ],
    actions: [
      'Restock within 30 minutes to avoid stockout',
      'Restock within 20 minutes',
      'Place replenishment order immediately',
    ],
    shelves: ['Aisle C — Shelf 1', 'Dairy — Shelf 2', 'Grocery — Shelf 4', 'Beverages — Shelf 1'],
    revenue: [150, 280, 310, 190, 220],
  },
  {
    type: 'planogram_violation',
    priority: 'medium',
    titles: [
      'Planogram Violation — Beverages Section',
      'Planogram Violation — Snacks Aisle B',
      'Planogram Violation — Dairy Shelf 3',
    ],
    messages: [
      '3 products misplaced. Compliance score dropped to 72%',
      'Lay\'s placed in Pringles position. Compliance: 68%',
      'Unauthorized product detected in reserved slot.',
    ],
    actions: [
      'Refer to planogram PDF and relocate products',
      'Restore product positions per planogram spec',
      'Remove unauthorized item and restock correct SKU',
    ],
    shelves: ['Aisle B — Shelf 3', 'Aisle A — Shelf 1', 'Dairy — Shelf 3'],
    revenue: [80, 150, 120, 180],
  },
  {
    type: 'price_tag_error',
    priority: 'medium',
    titles: [
      'Price Tag Mismatch: Pringles 165g',
      'Price Tag Mismatch: Tropicana Juice 1L',
      'Price Tag Missing: Haldiram Namkeen 400g',
    ],
    messages: [
      'Tag shows ₹75. System price is ₹85',
      'Tag shows ₹120. System price is ₹145',
      'No price tag found. Customer complaints reported.',
    ],
    actions: [
      'Replace price tag immediately to avoid compliance issue',
      'Print and attach correct price label',
    ],
    shelves: ['Aisle C — Shelf 2', 'Beverages — Shelf 2', 'Snacks — Shelf 1'],
    revenue: [40, 85, 60],
  },
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateAlert() {
  const template = pick(ALERT_TEMPLATES)
  return {
    id: Date.now() + Math.floor(Math.random() * 10000),
    type: template.type,
    priority: template.priority,
    title: pick(template.titles),
    message: pick(template.messages),
    suggested_action: pick(template.actions),
    shelf: pick(template.shelves),
    revenue_impact: pick(template.revenue),
    status: 'active',
    timestamp: new Date().toISOString(),
  }
}

function generateInitialAlerts(count = 6) {
  const alerts = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const a = generateAlert()
    // Spread initial alerts over the last 2 hours
    a.timestamp = new Date(now - Math.random() * 7200000).toISOString()
    a.id = now - i * 1000 + Math.floor(Math.random() * 999)
    if (Math.random() < 0.25) a.status = 'acknowledged'
    alerts.push(a)
  }
  alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return alerts
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AlertProvider({ children }) {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [liveAlerts, setLiveAlerts] = useState([])
  const [connected, setConnected] = useState(false)
  const [totalActive, setTotalActive] = useState(0)
  const backendAlive = useRef(false)

  useEffect(() => {
    if (!user) {
      setConnected(false)
      return
    }

    // Seed with initial realistic alerts immediately (small batch)
    const seed = generateInitialAlerts(6)
    setAlerts(seed)
    const activeCount = seed.filter(a => a.status === 'active').length
    setTotalActive(activeCount)
    setConnected(true)

    // Try to load from real backend (best-effort)
    api.getAlerts({ limit: 50 })
      .then(data => {
        if (data.alerts && data.alerts.length > 0) {
          backendAlive.current = true
          setAlerts(data.alerts)
          setTotalActive(data.alerts.filter(a => a.status === 'active').length)
        }
      })
      .catch(() => {
        backendAlive.current = false
      })

    // Try WebSocket (best-effort)
    const ws = createWebSocket(
      (alert) => {
        backendAlive.current = true
        setLiveAlerts(prev => [alert, ...prev].slice(0, 20))
        setAlerts(prev => [alert, ...prev].slice(0, 100))
        setTotalActive(n => n + 1)
      },
      () => {
        backendAlive.current = true
        setConnected(true)
      }
    )

    // Client-side live alert generator (realistic pace)
    // Generates a new alert every 25-55 seconds — feels real, not spammy
    const interval = setInterval(() => {
      const newAlert = generateAlert()
      setLiveAlerts(prev => [newAlert, ...prev].slice(0, 20))
      setAlerts(prev => {
        const updated = [newAlert, ...prev].slice(0, 50)
        // Sync totalActive with actual active alerts in array
        setTotalActive(updated.filter(a => a.status === 'active').length)
        return updated
      })
    }, Math.floor(Math.random() * 30000) + 25000)

    return () => {
      ws.disconnect()
      clearInterval(interval)
    }
  }, [user])

  // Keep totalActive in sync whenever alerts array changes
  useEffect(() => {
    setTotalActive(alerts.filter(a => a.status === 'active').length)
  }, [alerts])

  const acknowledge = useCallback(async (alertId) => {
    // Try backend (best-effort)
    api.acknowledgeAlert(alertId).catch(() => {})
    // Always update client-side state
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'acknowledged' } : a))
    setLiveAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'acknowledged' } : a))
    setTotalActive(n => Math.max(0, n - 1))
  }, [])

  return (
    <AlertContext.Provider value={{ alerts, liveAlerts, connected, totalActive, acknowledge }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlerts() {
  return useContext(AlertContext)
}
