import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './hooks/useAppState.jsx'
import Sidebar from './components/Sidebar.jsx'
import Toast from './components/Toast.jsx'
import { IconMenu } from './components/Icons.jsx'

import DashboardPage  from './pages/DashboardPage.jsx'
import TeachersPage   from './pages/TeachersPage.jsx'
import WorkshopsPage  from './pages/WorkshopsPage.jsx'
import AttendancePage from './pages/AttendancePage.jsx'
import ReportsPage    from './pages/ReportsPage.jsx'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <AppProvider>
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
            <Route path="/workshops"  element={<WorkshopsPage />}  />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/reports"    element={<ReportsPage />}    />
          </Routes>
        </div>
      </div>
      <Toast />
    </AppProvider>
  )
}
