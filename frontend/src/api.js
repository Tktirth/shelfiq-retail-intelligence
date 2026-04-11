/**
 * API client for Smart Retail Shelf Intelligence
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace('http', 'ws');

async function fetchJson(path, options = {}) {
  const token = localStorage.getItem('access_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options
  });
  
  if (res.status === 401) {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  getStore: () => fetchJson('/api/store'),
  getShelves: () => fetchJson('/api/shelves'),
  getShelf: (id) => fetchJson(`/api/shelves/${id}`),
  getAlerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`/api/alerts${qs ? '?' + qs : ''}`);
  },
  acknowledgeAlert: (id) => fetchJson(`/api/alerts/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ alert_id: id })
  }),
  simulateAlert: (type = 'stockout') => fetchJson(`/api/alerts/simulate?alert_type=${type}`, { method: 'POST' }),
  getForecast: (sku, storeId = 1, horizon = 7) => fetchJson(`/api/forecast/${sku}?store_id=${storeId}&horizon_days=${horizon}`),
  getReplenishment: () => fetchJson('/api/replenishment'),
  getCompliance: () => fetchJson('/api/compliance'),
  getHeatmap: () => fetchJson('/api/analytics/heatmap'),
  getKPIs: () => fetchJson('/api/analytics/kpis'),
  getComplianceTrend: () => fetchJson('/api/analytics/compliance-trend'),
  analyzeShelf: async (shelfId, file) => {
    const formData = new FormData();
    if (file) formData.append('file', file);
    
    const token = localStorage.getItem('access_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/analyze-shelf?shelf_id=${shelfId}`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (res.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    
    return res.json();
  }
};

export function createWebSocket(onMessage, onConnect) {
  let ws = null;
  let reconnectTimer = null;
  let pingInterval = null;
  let isConnecting = false;

  const cleanup = () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  };

  const connect = () => {
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;
    isConnecting = true;

    try {
      ws = new WebSocket(`${WS_BASE}/ws/alerts`);

      ws.onopen = () => {
        isConnecting = false;
        if (onConnect) onConnect();
        // Keepalive ping every 25s — store ID for cleanup
        cleanup();
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 25000);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'alert' && onMessage) onMessage(data.data);
        } catch {}
      };

      ws.onclose = () => {
        isConnecting = false;
        cleanup();
        // Reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        isConnecting = false;
        cleanup();
        ws.close();
      };
    } catch (e) {
      isConnecting = false;
    }
  };

  connect();

  return {
    disconnect: () => {
      clearTimeout(reconnectTimer);
      cleanup();
      if (ws) ws.close();
    }
  };
}
