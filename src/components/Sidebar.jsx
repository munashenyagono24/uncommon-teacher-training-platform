import { NavLink } from 'react-router-dom'
import { useApp } from '../hooks/useAppState.jsx'
import {
  IconDashboard, IconPeople, IconEvent,
  IconQR, IconReport, IconSync, IconWifiOff,
} from './Icons.jsx'

const NAV = [
  { to: '/',           label: 'Dashboard',      Icon: IconDashboard },
  { to: '/teachers',   label: 'Teachers',       Icon: IconPeople    },
  { to: '/requisitions', label: 'Requisitions', Icon: IconReport    },
  { to: '/workshops',  label: 'Workshops',      Icon: IconEvent     },
  { to: '/attendance', label: 'Take Attendance', Icon: IconQR       },
  { to: '/reports',    label: 'Reports',        Icon: IconReport    },
]

export default function Sidebar({ open, onClose }) {
  const { state, syncPending } = useApp()

  return (
    <>
      {/* Overlay for mobile */}
      {open && <div className="sidebar-overlay" onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99,
      }} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <h1>Uncommon.org</h1>
          <span>Teacher Training Platform</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status */}
        <div className="sidebar-footer">
          {!state.isOnline ? (
            <span className="status-badge offline">
              <IconWifiOff /> Offline mode
            </span>
          ) : state.pending > 0 ? (
            <button className="status-badge pending" onClick={syncPending}>
              <IconSync /> Sync {state.pending} records
            </button>
          ) : (
            <span className="status-badge online">
              ● All synced
            </span>
          )}
        </div>
      </aside>
    </>
  )
}
