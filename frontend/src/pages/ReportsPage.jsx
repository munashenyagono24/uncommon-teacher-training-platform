import { useState, useMemo } from 'react'
import { useApp } from '../hooks/useAppState.jsx'
import { exportAttendance, fmtDate, fmtDateTime } from '../utils/helpers.js'
import { IconDownload, IconSearch, IconCheck, IconSync, IconReport } from '../components/Icons.jsx'

export default function ReportsPage() {
  const { state } = useApp()
  const { teachers, workshops, attendance } = state

  const [filterWorkshop, setFilterWorkshop] = useState('')
  const [filterRegion, setFilterRegion]     = useState('')
  const [filterBootcamp, setFilterBootcamp] = useState('')
  const [filterSync, setFilterSync]         = useState('')
  const [search, setSearch]                 = useState('')

  const teacherMap  = Object.fromEntries(teachers.map(t => [t.id, t]))
  const workshopMap = Object.fromEntries(workshops.map(w => [w.id, w]))

  // Unique values for filters
  const regions   = [...new Set(teachers.map(t => t.region))].sort()
  const bootcamps = [...new Set(teachers.map(t => t.bootcamp))].sort()

  const filtered = useMemo(() => {
    return attendance.filter(rec => {
      const t = teacherMap[rec.teacherId]
      const q = search.toLowerCase()
      if (filterWorkshop && rec.workshopId !== filterWorkshop) return false
      if (filterRegion   && t?.region !== filterRegion)        return false
      if (filterBootcamp && t?.bootcamp !== filterBootcamp)    return false
      if (filterSync     && rec.syncStatus !== filterSync)     return false
      if (q && !(t?.fullName.toLowerCase().includes(q) || t?.teacherId.toLowerCase().includes(q))) return false
      return true
    }).sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))
  }, [attendance, filterWorkshop, filterRegion, filterBootcamp, filterSync, search])

  // Summary stats
  const totalPresent  = filtered.filter(r => r.status === 'present').length
  const pendingSync   = filtered.filter(r => r.syncStatus === 'pending').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports</h2>
          <p>{attendance.length} total attendance records</p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => exportAttendance(filtered, teachers, workshops)}
            disabled={filtered.length === 0}
          >
            <IconDownload /> Export to Excel
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Summary cards */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <MiniStat label="Filtered Records" value={filtered.length} />
          <MiniStat label="Present"           value={totalPresent} color="var(--green-dark)" />
          <MiniStat label="Pending Sync"      value={pendingSync}  color={pendingSync > 0 ? 'var(--gold)' : undefined} />
          <MiniStat label="Workshops Covered" value={new Set(filtered.map(r => r.workshopId)).size} />
        </div>

        {/* Filters */}
        <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div className="search-wrap" style={{ minWidth: 200 }}>
            <IconSearch />
            <input
              type="text"
              placeholder="Search teacher name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterWorkshop} onChange={e => setFilterWorkshop(e.target.value)} style={{ minWidth: 180 }}>
            <option value="">All Workshops</option>
            {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={{ minWidth: 150 }}>
            <option value="">All Regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterBootcamp} onChange={e => setFilterBootcamp(e.target.value)} style={{ minWidth: 150 }}>
            <option value="">All Schools</option>
            {bootcamps.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterSync} onChange={e => setFilterSync(e.target.value)} style={{ minWidth: 130 }}>
            <option value="">All Sync Status</option>
            <option value="synced">Synced</option>
            <option value="pending">Pending</option>
          </select>
          {(filterWorkshop || filterRegion || filterBootcamp || filterSync || search) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setFilterWorkshop(''); setFilterRegion(''); setFilterBootcamp(''); setFilterSync(''); setSearch('') }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <IconReport />
            <h3>{attendance.length === 0 ? 'No attendance records yet' : 'No records match your filters'}</h3>
            <p>{attendance.length === 0
              ? 'Take attendance at a workshop to see records here.'
              : 'Adjust or clear the filters above.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Teacher ID</th>
                  <th>Region</th>
                  <th>Bootcamp</th>
                  <th>Workshop</th>
                  <th>Date</th>
                  <th>Check-in</th>
                  <th>Status</th>
                  <th>Sync</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rec => {
                  const t = teacherMap[rec.teacherId]
                  const w = workshopMap[rec.workshopId]
                  return (
                    <tr key={rec.id}>
                      <td className="td-name">{t?.fullName ?? '—'}</td>
                      <td><code style={{ fontSize: 12 }}>{t?.teacherId ?? '—'}</code></td>
                      <td>{t?.region ?? '—'}</td>
                      <td>{t?.bootcamp ?? '—'}</td>
                      <td>{w?.name ?? '—'}</td>
                      <td className="td-sub">{fmtDate(w?.date)}</td>
                      <td className="td-sub">{fmtDateTime(rec.checkInTime)}</td>
                      <td>
                        <span className={`badge ${rec.status === 'present' ? 'badge-green' : rec.status === 'late' ? 'badge-gold' : 'badge-red'}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        {rec.syncStatus === 'synced'
                          ? <span className="badge badge-green"><IconCheck /> synced</span>
                          : <span className="badge badge-gold"><IconSync /> pending</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="stat-card" style={{ padding: '14px 18px' }}>
      <div>
        <div className="label">{label}</div>
        <div className="value" style={{ fontSize: 26, color: color ?? 'var(--green-dark)' }}>{value}</div>
      </div>
    </div>
  )
}
