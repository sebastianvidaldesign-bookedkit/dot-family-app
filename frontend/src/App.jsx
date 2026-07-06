import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Today from './pages/child/Today'
import CalendarView from './pages/child/CalendarView'
import NextPeriod from './pages/child/NextPeriod'
import Settings from './pages/child/Settings'
import Dashboard from './pages/parent/Dashboard'
import ChildLayout from './components/ChildLayout'

function RoleRoute({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/login" replace />
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'child'
    ? <Navigate to="/today" replace />
    : <Navigate to="/parent" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<RootRedirect />} />

          {/* Child routes */}
          <Route path="/" element={
            <RoleRoute role="child">
              <ChildLayout />
            </RoleRoute>
          }>
            <Route path="today"       element={<Today />} />
            <Route path="calendar"    element={<CalendarView />} />
            <Route path="next-period" element={<NextPeriod />} />
            <Route path="settings"    element={<Settings />} />
          </Route>

          {/* Parent routes */}
          <Route path="/parent" element={
            <RoleRoute role="parent">
              <Dashboard />
            </RoleRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
