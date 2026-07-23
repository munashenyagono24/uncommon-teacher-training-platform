import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../hooks/useAppState.jsx'
import { uid, fmtDate, fmtDateTime, initials } from '../utils/helpers.js'
import { IconQR, IconCheck, IconX, IconWifiOff } from '../components/Icons.jsx'

export default function AttendancePage() {
  const { state, recordAttendance, toast, clearImportAttendees } = useApp()
  const { teachers, workshops, attendance, isOnline, importAttendeesState } = state

  const [workshopId, setWorkshopId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null) // { teacher, status: 'ok'|'error'|'duplicate', msg }
  const [sessionLog, setSessionLog] = useState([])
  const [manualParticipants, setManualParticipants] = useState([])
  const [loadingPrevious, setLoadingPrevious] = useState(false)
  
  const scannerRef = useRef(null)
  const scannerObjRef = useRef(null)
  
  // Refs to prevent rapid double-scans and stale closures within the scanner instance
  const handleScanRef = useRef(null)
  const debounceRef = useRef({ raw: null, time: 0 })

  const selectedWorkshop = workshops.find(w => w.id === workshopId)

  useEffect(() => {
    if (!importAttendeesState || !workshops.length || !attendance.length || !teachers.length) return

    const { sourceWorkshopId, targetWorkshopId } = importAttendeesState
    if (!sourceWorkshopId || !targetWorkshopId) {
      clearImportAttendees()
      return
    }

    if (!workshopId) {
      setWorkshopId(targetWorkshopId)
    }

    const sourceWorkshop = workshops.find(w => w.id === sourceWorkshopId)
    if (!sourceWorkshop) {
      toast('Could not find source workshop for import', 'error')
      clearImportAttendees()
      return
    }

    const participants = attendance
      .filter(a => a.workshopId === sourceWorkshopId)
      .map(a => {
        const teacher = teachers.find(t => t.id === a.teacherId)
        return teacher ? { teacherId: teacher.id, teacher, status: 'absent' } : null
      })
      .filter(Boolean)

    if (participants.length === 0) {
      toast(`No attendees found from ${sourceWorkshop.name}`, 'error')
      clearImportAttendees()
      return
    }

    setManualParticipants(participants)
    toast(`Imported ${participants.length} teachers from ${sourceWorkshop.name}`, 'success')
    clearImportAttendees()
  }, [importAttendeesState, workshopId, workshops, attendance, teachers, clearImportAttendees, toast])

  useEffect(() => {
    setManualParticipants([])
    setLastScan(null)
  }, [workshopId])

  // Sorted workshops: upcoming/today first
  const sortedWorkshops = [...workshops].sort((a, b) => b.date.localeCompare(a.date))

  const handleScan = useCallback(async (raw) => {
    // Debounce to prevent the scanner from rapidly firing multiple events for the same code
    const now = Date.now()
    if (debounceRef.current.raw === raw && (now - debounceRef.current.time) < 3000) {
      return
    }
    debounceRef.current = { raw, time: now }

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

  // Keep the ref updated with the latest handleScan to avoid stale closures in the HTML5Qrcode component
  useEffect(() => {
    handleScanRef.current = handleScan
  }, [handleScan])

  // Start/stop scanner using core Html5Qrcode to bypass the fallback UI
  useEffect(() => {
    if (!scanning || !workshopId) return

    let cancelled = false
    const containerId = 'qr-scanner-view'

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return
      
      const scanner = new Html5Qrcode(containerId)
      scannerObjRef.current = scanner

      scanner.start(
        { facingMode: "environment" }, // Forces the direct camera stream
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decoded) => {
          if (handleScanRef.current) handleScanRef.current(decoded)
        },
        () => {} // per-frame error - ignore
      ).catch(() => {
        if (!cancelled) {
          toast('Could not access camera. Please check permissions.', 'error')
          setScanning(false)
        }
      })
    }).catch(() => {
      if (!cancelled) {
        toast('Failed to load scanner module', 'error')
        setScanning(false)
      }
    })

    return () => {
      cancelled = true
      if (scannerObjRef.current) {
        const s = scannerObjRef.current
        s.stop().then(() => {
          s.clear()
        }).catch(() => {
          try { s.clear() } catch (e) {}
        })
        scannerObjRef.current = null
      }
    }
  }, [scanning, workshopId, toast])

  const stopScanner = () => {
    if (scannerObjRef.current) {
      const s = scannerObjRef.current
      s.stop().then(() => {
        s.clear()
      }).catch(() => {
        try { s.clear() } catch (e) {}
      })
      scannerObjRef.current = null
    }
    setScanning(false)
  }

  // Load teachers who attended the most recent earlier workshop at the same location
  const loadPreviousParticipants = useCallback(() => {
    if (!selectedWorkshop) return
    setLoadingPrevious(true)

    const previousWorkshop = workshops
      .filter(w =>
        w.location === selectedWorkshop.location &&
        w.id !== selectedWorkshop.id &&
        w.date < selectedWorkshop.date
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0]

    if (!previousWorkshop) {
      toast('No previous workshop found at this location', 'error')
      setLoadingPrevious(false)
      return
    }

    const previousAttendance = attendance.filter(a => a.workshopId === previousWorkshop.id)
    const participants = previousAttendance
      .map(a => {
        const teacher = teachers.find(t => t.id === a.teacherId)
        return teacher ? { teacherId: teacher.id, teacher, status: 'absent' } : null
      })
      .filter(Boolean)

    setManualParticipants(participants)
    setLoadingPrevious(false)
    toast(`Loaded ${participants.length} participants from ${fmtDate(previousWorkshop.date)}`, 'success')
  }, [selectedWorkshop, workshops, attendance, teachers, toast])

  // Add a single teacher manually via the dropdown
  const addManualParticipant = (teacherId) => {
    if (!teacherId) return
    if (manualParticipants.some(p => p.teacherId === teacherId)) return
    const teacher = teachers.find(t => t.id === teacherId)
    if (!teacher) return
    setManualParticipants(prev => [...prev, { teacherId, teacher, status: 'absent' }])
  }

  // Toggle a participant's status between present/absent
  const setManualStatus = (teacherId, status) => {
    setManualParticipants(prev =>
      prev.map(p => (p.teacherId === teacherId ? { ...p, status } : p))
    )
  }

  // Save all marked participants as attendance records
  const submitManualAttendance = async () => {
    let count = 0
    for (const p of manualParticipants) {
      const already = attendance.some(a => a.teacherId === p.teacherId && a.workshopId === workshopId)
      if (already) continue

      const record = {
        id: uid(),
        teacherId: p.teacherId,
        workshopId,
        checkInTime: new Date().toISOString(),
        status: p.status,
        syncStatus: isOnline ? 'synced' : 'pending',
      }
      await recordAttendance(record)
      setSessionLog(prev => [{ ...record, teacher: p.teacher }, ...prev])
      count++
    }
    toast(`Recorded attendance for ${count} participant(s)`, 'success')
    setManualParticipants([])
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

            {/* Manual attendance */}
            {workshopId && (
              <div className="card">
                <div className="card-body">
                  <h3 className="card-title">3. Manual Attendance</h3>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary btn-sm" onClick={loadPreviousParticipants} disabled={loadingPrevious}>
                      {loadingPrevious ? 'Loading…' : 'Load Previous Session'}
                    </button>
                    <select onChange={e => { addManualParticipant(e.target.value); e.target.value = '' }} defaultValue="">
                      <option value="">+ Add teacher manually…</option>
                      {teachers
                        .filter(t => !manualParticipants.some(p => p.teacherId === t.id))
                        .map(t => (
                          <option key={t.id} value={t.id}>{t.fullName} — {t.region}</option>
                        ))}
                    </select>
                  </div>

                  {manualParticipants.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                      No participants loaded. Load a previous session or add teachers manually.
                    </p>
                  ) : (
                    <>
                      <div className="check-in-list" style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {manualParticipants.map(p => (
                          <div key={p.teacherId} className="check-in-item">
                            <div className="check-in-avatar">{initials(p.teacher.fullName)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="name">{p.teacher.fullName}</div>
                              <div className="time">{p.teacher.region} · {p.teacher.bootcamp}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button
                                className={`btn btn-sm ${p.status === 'present' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setManualStatus(p.teacherId, 'present')}
                              >
                                <IconCheck /> Present
                              </button>
                              <button
                                className={`btn btn-sm ${p.status === 'absent' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setManualStatus(p.teacherId, 'absent')}
                              >
                                <IconX /> Absent
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ marginTop: 14, width: '100%' }}
                        onClick={submitManualAttendance}
                      >
                        Save Attendance for {manualParticipants.length} Participant(s)
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

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