import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ShelvesPage from './pages/ShelvesPage'
import AlertsPage from './pages/AlertsPage'
import ForecastPage from './pages/ForecastPage'
import AnalyticsPage from './pages/AnalyticsPage'
import Login from './pages/Login'
import { AlertProvider } from './hooks/useAlerts'
import { AuthProvider, useAuth } from './context/AuthContext'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  return (
    <>
      {user && <div className="neural-scan-line" />}
      {user && <Sidebar />}
      <div className={user ? "main-content" : "w-full"}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/shelves" element={<PrivateRoute><ShelvesPage /></PrivateRoute>} />
          <Route path="/alerts" element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
          <Route path="/forecast" element={<PrivateRoute><ForecastPage /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
        </Routes>
      </div>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AlertProvider>
        <div className={useAuth()?.user ? "app-layout" : "min-h-screen bg-gray-950"}>
          <AppContent />
        </div>
      </AlertProvider>
    </AuthProvider>
  )
}

