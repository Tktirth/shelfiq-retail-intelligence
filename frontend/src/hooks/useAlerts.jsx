import { useState, useEffect, useContext, createContext, useCallback } from 'react'
import { createWebSocket, api } from '../api'
import { useAuth } from '../context/AuthContext'

const AlertContext = createContext(null)

export function AlertProvider({ children }) {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [liveAlerts, setLiveAlerts] = useState([])
  const [connected, setConnected] = useState(false)
  const [totalActive, setTotalActive] = useState(0)

  useEffect(() => {
    if (!user) {
      setConnected(false)
      return;
    }

    // Load initial alerts
    api.getAlerts({ limit: 50 }).then(data => {
      setAlerts(data.alerts || [])
      setTotalActive((data.alerts || []).filter(a => a.status === 'active').length)
    }).catch(() => {})

    // Connect WebSocket
    const ws = createWebSocket(
      (alert) => {
        setLiveAlerts(prev => [alert, ...prev].slice(0, 20))
        setAlerts(prev => [alert, ...prev].slice(0, 100))
        setTotalActive(n => n + 1)
      },
      () => setConnected(true)
    )

    return () => ws.disconnect()
  }, [user])

  const acknowledge = useCallback(async (alertId) => {
    await api.acknowledgeAlert(alertId).catch(() => {})
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'acknowledged' } : a))
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
