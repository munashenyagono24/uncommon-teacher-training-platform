import { useApp } from '../hooks/useAppState.jsx'
import { fmtDate, initials } from '../utils/helpers.js'
import { useNavigate } from 'react-router-dom'
import { IconPeople, IconEvent, IconQR, IconReport } from '../components/Icons.jsx'

export default function DashboardPage() {
  const { state } = useApp()
  const { teachers, workshops, attendance } = state
  const nav = useNavigate()

  // Stats
  const totalCheckins = attendance.length
  const avgPerWorkshop = workshops.length
    ? Math.round(totalCheckins / workshops.length)
    : 0

  // Recent workshops with attendance count
  const recentWorkshops = [...workshops]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(w => ({
      ...w,
      count: attendance.filter(a => a.workshopId === w.id).length,
    }))

  // Recent check-ins (last 8)
  const recentCheckins = [...attendance]
    .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))
    .slice(0, 8)
    .map(rec => {
      const teacher = teachers.find(t => t.id === rec.teacherId)
      const workshop = workshops.find(w => w.id === rec.workshopId)
      return { ...rec, teacher, workshop }
    })

  // Teachers by region
  const byRegion = {}
  teachers.forEach(t => { byRegion[t.region] = (byRegion[t.region] ?? 0) + 1 })
  const regionEntries = Object.entries(byRegion).sort((a, b) => b[1] - a[1])

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of the Teacher Training programme</p>
        </div>
      </div>

      <div className="page-body">

        {/* Stat cards */}
        <div className="stats-grid">
          <StatCard
            label="Teachers Registered"
            value={teachers.length}
            sub="permanent QR codes issued"
            color="#1a5c3a"
            bg="#e8f5ee"
            icon={<IconPeople />}
          />
          <StatCard
            label="Workshops"
            value={workshops.length}
            sub="training sessions created"
            color="#2e7d52"
            bg="#e8f5ee"
            icon={<IconEvent />}
          />
          <StatCard
            label="Total Check-ins"
            value={totalCheckins}
            sub="attendance records captured"
            color="#c9922a"
            bg="#fdf3e3"
            icon={<IconQR />}
          />
          <StatCard
            label="Avg per Workshop"
            value={avgPerWorkshop}
            sub="average attendance"
            color="#5e35b1"
            bg="#ede7f6"
            icon={<IconReport />}
          />
        </div>

        <div className="grid-2" style={{ gap: 20 }}>
          {/* Recent workshops */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 className="card-title" style={{ margin: 0 }}>Recent Workshops</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => nav('/workshops')}>View all</button>
              </div>

              {recentWorkshops.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No workshops yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {recentWorkshops.map((w, i) => (
                    <div key={w.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(w.date)} · {w.location}</div>
                        </div>
                        <span className={`badge ${w.count >= w.expectedParticipants ? 'badge-green' : 'badge-gray'}`}>
                          {w.count} / {w.expectedParticipants}
                        </span>
                      </div>
                      {i < recentWorkshops.length - 1 && <div className="divider" style={{ margin: 0 }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Teachers by region */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 className="card-title" style={{ margin: 0 }}>Teachers by Region</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => nav('/teachers')}>View all</button>
              </div>

              {regionEntries.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No teachers registered yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {regionEntries.map(([region, count]) => (
                    <div key={region} className="progress-wrap">
                      <div className="progress-label">
                        <span style={{ fontSize: 13 }}>{region}</span>
                        <strong style={{ fontSize: 13 }}>{count}</strong>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.round((count / teachers.length) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent check-ins */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="card-title" style={{ margin: 0 }}>Recent Check-ins</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => nav('/reports')}>Full report</button>
            </div>

            {recentCheckins.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <p>No check-ins yet. <button className="btn btn-primary btn-sm" onClick={() => nav('/attendance')}>Take Attendance</button></p>
              </div>
            ) : (
              <div className="check-in-list">
                {recentCheckins.map(rec => (
                  <div key={rec.id} className="check-in-item">
                    <div className="check-in-avatar">
                      {initials(rec.teacher?.fullName ?? '?')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name">{rec.teacher?.fullName ?? 'Unknown Teacher'}</div>
                      <div className="time">{rec.workshop?.name ?? '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className="badge badge-green">{rec.status}</span>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                        {new Date(rec.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, bg, icon }) {
  return (
    <div className="stat-card">
      <div>
        <div className="label">{label}</div>
        <div className="value" style={{ color }}>{value}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="stat-icon" style={{ background: bg, color }}>
        {icon}
      </div>
    </div>
  )
}
