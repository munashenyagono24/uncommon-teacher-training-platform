import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './hooks/useAppState.jsx'
import Sidebar from './components/Sidebar.jsx'
import Toast from './components/Toast.jsx'
import { IconMenu } from './components/Icons.jsx'

import DashboardPage  from './pages/DashboardPage.jsx'
import TeachersPage   from './pages/TeachersPage.jsx'
import RequisitionsPage from './pages/RequisitionsPage.jsx'
import WorkshopsPage  from './pages/WorkshopsPage.jsx'
import AttendancePage from './pages/AttendancePage.jsx'
import ReportsPage    from './pages/ReportsPage.jsx'

import AuthPage from './pages/AuthPage.jsx'
import TeacherPortal from './pages/TeacherPortal.jsx'

function AppContent() {
  const { state } = useApp()
  const { token, user } = state
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!token) {
    return <AuthPage />
  }

  if (user && user.role === 'teacher') {
    return <TeacherPortal />
  }

  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Mobile topbar */}
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <IconMenu />
          </button>
          <h2>Uncommon.org</h2>
        </header>

        <Routes>
          <Route path="/"           element={<DashboardPage />}  />
          <Route path="/teachers"   element={<TeachersPage />}   />
          <Route path="/requisitions" element={<RequisitionsPage />} />
          <Route path="/workshops"  element={<WorkshopsPage />}  />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/reports"    element={<ReportsPage />}    />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toast />
    </AppProvider>
  )
}
