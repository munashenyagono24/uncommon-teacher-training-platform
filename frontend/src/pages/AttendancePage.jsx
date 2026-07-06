import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../hooks/useAppState.jsx'
import { uid, fmtDate, fmtDateTime, initials } from '../utils/helpers.js'
import { IconQR, IconCheck, IconX, IconWifiOff } from '../components/Icons.jsx'

export default function AttendancePage() {
  const { state, recordAttendance, toast } = useApp()
  const { teachers, workshops, attendance, isOnline } = state

  const [workshopId, setWorkshopId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null) // { teacher, status: 'ok'|'error'|'duplicate', msg }
  const [sessionLog, setSessionLog] = useState([])
  const scannerRef = useRef(null)
  const scannerObjRef = useRef(null)

  const selectedWorkshop = workshops.find(w => w.id === workshopId)

  // Sorted workshops: upcoming/today first
  const sortedWorkshops = [...workshops].sort((a, b) => b.date.localeCompare(a.date))

  // Start/stop scanner
  useEffect(() => {
    if (!scanning || !workshopId) return

    let cancelled = false
    const containerId = 'qr-scanner-view'

    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (cancelled) return
      const scanner = new Html5QrcodeScanner(
        containerId,
        { fps: 10, qrbox: { width: 230, height: 230 }, rememberLastUsedCamera: true },
        false
      )
      scanner.render(
        (decoded) => handleScan(decoded),
        () => {} // per-frame error - ignore
      )
      scannerObjRef.current = scanner
    }).catch(() => {
      toast('Could not access camera', 'error')
      setScanning(false)
    })

    return () => {
      cancelled = true
      scannerObjRef.current?.clear().catch(() => {})
      scannerObjRef.current = null
    }
  }, [scanning, workshopId])

  const handleScan = useCallback(async (raw) => {
    let parsed
    try { parsed = JSON.parse(raw) } catch { parsed = { id: raw } }

    // Find teacher by id or teacherId
    const teacher = teachers.find(t => t.id === parsed.id || t.teacherId === parsed.teacherId)

    if (!teacher) {
      setLastScan({ status: 'error', msg: 'QR code not recognised. Teacher not found.' })
      return
    }

    // Check duplicate in this session
    const already = attendance.some(
      a => a.teacherId === teacher.id && a.workshopId === workshopId
    )
    if (already) {
      setLastScan({ teacher, status: 'duplicate', msg: 'Already checked in for this workshop.' })
      return
    }

    const record = {
      id: uid(),
      teacherId: teacher.id,
      workshopId,
      checkInTime: new Date().toISOString(),
      status: 'present',
      syncStatus: isOnline ? 'synced' : 'pending',
    }
    await recordAttendance(record)
    setLastScan({ teacher, status: 'ok', msg: 'Checked in successfully!' })
    setSessionLog(prev => [{ ...record, teacher }, ...prev])
  }, [teachers, attendance, workshopId, isOnline, recordAttendance])

  const stopScanner = () => {
    scannerObjRef.current?.clear().catch(() => {})
    scannerObjRef.current = null
    setScanning(false)
  }

  const sessionCount = sessionLog.length

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Take Attendance</h2>
          <p>Scan teacher QR codes to record attendance</p>
        </div>
        {!isOnline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#c9922a', background: '#fdf3e3', padding: '6px 12px', borderRadius: 6 }}>
            <IconWifiOff /> Offline — records will sync when back online
          </div>
        )}
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>

          {/* Left: scanner panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Workshop selector */}
            <div className="card">
              <div className="card-body">
                <h3 className="card-title">1. Select Workshop</h3>
                {workshops.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                    No workshops found. Create one in the Workshops tab first.
                  </p>
                ) : (
                  <select value={workshopId} onChange={e => { setWorkshopId(e.target.value); stopScanner(); setLastScan(null); setSessionLog([]) }}>
                    <option value="">Choose a workshop…</option>
                    {sortedWorkshops.map(w => (
                      <option key={w.id} value={w.id}>{w.name} — {fmtDate(w.date)}</option>
                    ))}
                  </select>
                )}
                {selectedWorkshop && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--green-light)', borderRadius: 6, fontSize: 13 }}>
                    <strong>{selectedWorkshop.name}</strong><br />
                    {fmtDate(selectedWorkshop.date)} · {selectedWorkshop.location}
                  </div>
                )}
              </div>
            </div>

            {/* Scanner */}
            <div className="card">
              <div className="card-body">
                <h3 className="card-title">2. Scan QR Code</h3>

                {!workshopId ? (
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>Select a workshop above to enable scanning.</p>
                ) : !scanning ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ color: 'var(--muted)', marginBottom: 16 }}>
                      <IconQR style={{ width: 48, height: 48 }} />
                    </div>
                    <button className="btn btn-primary" onClick={() => setScanning(true)}>
                      <IconQR /> Start Camera Scanner
                    </button>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                      You'll be asked to allow camera access.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="scanner-container" id="qr-scanner-view" />
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={stopScanner}>
                      <IconX /> Stop Scanner
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Scan feedback */}
            {lastScan && (
              <div className={`scan-result ${lastScan.status === 'ok' ? 'success' : 'error'}`}>
                <div style={{ fontSize: 28 }}>
                  {lastScan.status === 'ok' ? '✅' : lastScan.status === 'duplicate' ? '⚠️' : '❌'}
                </div>
                <div>
                  {lastScan.teacher && <div className="name">{lastScan.teacher.fullName}</div>}
                  {lastScan.teacher && <div className="meta">{lastScan.teacher.teacherId} · {lastScan.teacher.region}</div>}
                  <div className="meta" style={{ marginTop: 4 }}>{lastScan.msg}</div>
                </div>
              </div>
            )}
          </div>

          {/* Right: session log */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 className="card-title" style={{ margin: 0 }}>Session Check-ins</h3>
                <span className="badge badge-green">{sessionCount} recorded</span>
              </div>

              {sessionLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 14 }}>
                  No check-ins yet this session.<br />Start scanning to see results here.
                </div>
              ) : (
                <div className="check-in-list">
                  {sessionLog.map((rec, i) => (
                    <div key={rec.id} className="check-in-item">
                      <div className="check-in-avatar">{initials(rec.teacher?.fullName ?? '?')}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="name">{rec.teacher?.fullName ?? 'Unknown'}</div>
                        <div className="time">{rec.teacher?.region} · {rec.teacher?.bootcamp}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {new Date(rec.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <span className={`badge ${rec.syncStatus === 'synced' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: 10, marginTop: 2 }}>
                          {rec.syncStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
