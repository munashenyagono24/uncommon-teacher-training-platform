import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../hooks/useAppState.jsx'
import { uid, fmtDate, initials } from '../utils/helpers.js'
import { IconQR, IconCheck, IconX } from '../components/Icons.jsx'

// Inline SVG components to ensure layout matches screenshots seamlessly
function IconCalendar({ style }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#64748b" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function IconMapPin({ style }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#64748b" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  )
}

function IconTrash({ style }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#ef4444" style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 6m-4.78 0L9 9m4.78-3.51zM4.5 6.75h15M5.62 6.75l.84 12.42a2.25 2.25 0 0 0 2.23 2.18h6.62a2.25 2.25 0 0 0 2.23-2.18l.84-12.42M9 3.75h6" />
    </svg>
  )
}

export default function WorkshopsPage() {
  const { state, recordAttendance, updateWorkshop, removeWorkshop, toast } = useApp()
  const { teachers = [], workshops = [], attendance = [], isOnline } = state

  // Navigation & View Management States
  const [activeWorkshopId, setActiveWorkshopId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Interactive Panel States
  const [scanning, setScanning] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [commentText, setCommentText] = useState('')

  const qrCodeInstanceRef = useRef(null)
  const currentWorkshop = workshops.find(w => w.id === activeWorkshopId)

  // Filter workshops list based on search term
  const filteredWorkshops = workshops.filter(w => 
    w.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate detailed dashboard stats for the currently selected workshop active screen
  const workshopAttendance = attendance.filter(a => a.workshopId === activeWorkshopId)
  const registeredCount = workshopAttendance.length
  const expectedCount = currentWorkshop?.expectedAttendees || 50
  const presentCount = workshopAttendance.filter(a => a.status === 'present').length
  const attendanceRate = expectedCount > 0 ? Math.round((presentCount / expectedCount) * 100) : 0

  // ── Programmatic QR Camera Stream Framework ──
  useEffect(() => {
    if (!scanning || !activeWorkshopId) return

    let isMounted = true
    const containerId = 'workshop-qr-engine'

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!isMounted) return

      // Allow container component to paint layout securely to prevent dark layout exceptions
      setTimeout(() => {
        if (!isMounted || !document.getElementById(containerId)) return

        try {
          const scanner = new Html5Qrcode(containerId)
          qrCodeInstanceRef.current = scanner

          scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              handleQrScanSuccess(decodedText)
            },
            () => { /* Mute framework frame noise */ }
          ).catch((err) => {
            console.error('Camera stream access failed:', err)
            toast('Could not access camera view stream', 'error')
            setScanning(false)
          })
        } catch (e) {
          console.error('Scanner init fault:', e)
          setScanning(false)
        }
      }, 300)
    })

    return () => {
      isMounted = false
      if (qrCodeInstanceRef.current) {
        if (qrCodeInstanceRef.current.isScanning) {
          qrCodeInstanceRef.current.stop().then(() => {
            qrCodeInstanceRef.current?.clear()
            qrCodeInstanceRef.current = null
          }).catch(err => console.warn('Clean close failed:', err))
        } else {
          qrCodeInstanceRef.current = null
        }
      }
    }
  }, [scanning, activeWorkshopId])

  const handleQrScanSuccess = useCallback(async (rawResult) => {
    let parsed
    try { 
      parsed = JSON.parse(rawResult) 
    } catch { 
      parsed = { id: rawResult } 
    }

    // Lookup structural records accurately matching variant keys
    const teacher = teachers.find(t => 
      t.id === parsed.id || 
      t.teacherId === parsed.teacherId || 
      t.id === rawResult || 
      t.teacherId === rawResult
    )

    if (!teacher) {
      toast('QR Code not recognized. Profile record missing.', 'error')
      return
    }

    // CRITICAL: Explicit duplicate prevention validation within active workshop
    const alreadyRegistered = attendance.some(
      a => a.teacherId === teacher.id && a.workshopId === activeWorkshopId
    )

    if (alreadyRegistered) {
      toast(`${teacher.fullName} is already registered/checked in!`, 'warning')
      return // Explicitly terminates logic loop to block duplicate records
    }

    const record = {
      id: uid(),
      teacherId: teacher.id,
      workshopId: activeWorkshopId,
      checkInTime: new Date().toISOString(),
      status: 'present',
      syncStatus: isOnline ? 'synced' : 'pending',
    }

    await recordAttendance(record)
    toast(`Successfully registered: ${teacher.fullName}`, 'success')
  }, [teachers, attendance, activeWorkshopId, isOnline, recordAttendance, toast])

  // ── Manual Add / Toggle Interactions ──
  const handleManualAddTeacher = async (teacherId) => {
    if (!teacherId) return
    const teacher = teachers.find(t => t.id === teacherId)
    if (!teacher) return

    const alreadyRegistered = attendance.some(
      a => a.teacherId === teacher.id && a.workshopId === activeWorkshopId
    )

    if (alreadyRegistered) {
      toast(`${teacher.fullName} is already listed here.`, 'warning')
      return
    }

    const record = {
      id: uid(),
      teacherId: teacher.id,
      workshopId: activeWorkshopId,
      checkInTime: new Date().toISOString(),
      status: 'present',
      syncStatus: isOnline ? 'synced' : 'pending',
    }

    await recordAttendance(record)
    toast(`Added ${teacher.fullName} manually`, 'success')
    setShowManualAdd(false)
  }

  const handleToggleStatus = async (record) => {
    const updatedRecord = {
      ...record,
      status: record.status === 'present' ? 'absent' : 'present',
      syncStatus: isOnline ? 'synced' : 'pending'
    }
    await recordAttendance(updatedRecord)
  }

  // ── Handling Comments/Notes Form ──
  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !currentWorkshop) return

    const updatedComments = [...(currentWorkshop.comments || []), {
      id: uid(),
      text: commentText.trim(),
      createdAt: new Date().toISOString()
    }]

    await updateWorkshop({
      ...currentWorkshop,
      comments: updatedComments
    })

    setCommentText('')
    toast('Session note updated', 'success')
  }

  const handleDeleteWorkshop = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await removeWorkshop(id)
      toast('Workshop record removed', 'success')
    }
  }

  // ────────────────────────────────────────────────────────
  // SCREEN VIEW 1: MAIN LANDING LIST VIEW
  // ────────────────────────────────────────────────────────
  if (!activeWorkshopId) {
    return (
      <div style={{ padding: '0 8px' }}>
        {/* Header Block Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: '700', color: '#0b4f9c' }}>Workshops</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 14 }}>
              {filteredWorkshops.length} training session{filteredWorkshops.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button 
            onClick={() => toast('Workshop creation feature form template placeholder', 'info')}
            style={{ background: '#0b4f9c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: '500', cursor: 'pointer' }}
          >
            + Create Workshop
          </button>
        </div>

        {/* Search Field Controls */}
        <div style={{ marginBottom: 24 }}>
          <input 
            type="text" 
            placeholder="Search by name or location..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}
          />
        </div>

        {/* Workshops Grid Template Wrapper */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredWorkshops.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              No matches found. Create a session or adjust search parameters.
            </div>
          ) : (
            filteredWorkshops.map(w => {
              const totalRegistered = attendance.filter(a => a.workshopId === w.id).length
              const targetMax = w.expectedAttendees || 50
              const barPercent = Math.min(100, Math.round((totalRegistered / targetMax) * 100))

              return (
                <div key={w.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  
                  {/* Delete Action Trigger */}
                  <button 
                    onClick={() => handleDeleteWorkshop(w.id, w.name)}
                    style={{ position: 'absolute', top: 20, right: 20, background: '#fee2e2', border: 'none', width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <IconTrash style={{ width: 16, height: 16 }} />
                  </button>

                  <h3 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: '600', color: '#0f172a', maxWidth: '80%' }}>{w.name}</h3>
                  
                  {/* Calendar Row Grid */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <IconCalendar style={{ width: 64, height: 64, strokeWidth: 1 }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: '500', color: '#475569' }}>{fmtDate(w.date)}</span>
                    </div>
                  </div>

                  {/* Location Pin Row Grid */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <IconMapPin style={{ width: 64, height: 64, strokeWidth: 1 }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: '500', color: '#475569' }}>{w.location || 'Not Specified'}</span>
                    </div>
                  </div>

                  {/* Metrics & Progress Bar Section */}
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: '500' }}>
                      <span>Attendance</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{totalRegistered} / {targetMax}</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                      <div style={{ width: `${barPercent}%`, height: '100%', background: '#0b4f9c', borderRadius: 4 }} />
                    </div>

                    {/* Action Panel Triggers */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button 
                        onClick={() => setActiveWorkshopId(w.id)}
                        style={{ flex: 1, background: '#0b4f9c', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontWeight: '600', cursor: 'pointer', textAlign: 'center' }}
                      >
                        View Dashboard
                      </button>
                      <button 
                        onClick={() => toast('No previous recorded historical sessions found', 'info')}
                        style={{ flex: 1, background: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontWeight: '500', cursor: 'pointer' }}
                      >
                        Previous Sessions
                      </button>
                    </div>
                  </div>

                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────
  // SCREEN VIEW 2: ACTIVE WORKSHOP METRICS & ATTENDANCE DASHBOARD
  // ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '0 8px' }}>
      {/* Back to landing screen control anchor layout */}
      <button 
        onClick={() => { setActiveWorkshopId(null); setScanning(false); setShowManualAdd(false); }}
        style={{ background: 'none', border: 'none', color: '#475569', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 16, fontSize: 14, fontWeight: '500', padding: 0 }}
      >
        ← Back
      </button>

      {/* Primary Dynamic Header Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: '700', color: '#0f172a' }}>{currentWorkshop.name}</h2>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: 14 }}>
            {currentWorkshop.location || 'Unknown Location'} · {fmtDate(currentWorkshop.date)} → {fmtDate(currentWorkshop.date)} · 1 day
          </p>
          <p style={{ margin: '4px 0 16px 0', color: '#64748b', fontSize: 14 }}>
            Facilitators: {currentWorkshop.facilitators?.length ? currentWorkshop.facilitators.join(', ') : 'None assigned'}
          </p>
        </div>
        <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
          {currentWorkshop.status || 'planned'}
        </span>
      </div>

      {/* Grid Quick Dashboard Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 32, fontWeight: '700', color: '#0f172a' }}>{registeredCount}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '500' }}>Registered</div>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 32, fontWeight: '700', color: '#0f172a' }}>{expectedCount}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '500' }}>Expected</div>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 32, fontWeight: '700', color: '#0f172a' }}>{presentCount}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '500' }}>Present marks</div>
        </div>
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 32, fontWeight: '700', color: '#0f172a' }}>{attendanceRate}%</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '500' }}>Attendance rate</div>
        </div>
      </div>

      {/* Action Control Modifiers Panel */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button 
          onClick={() => { setShowManualAdd(!showManualAdd); setScanning(false); }} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: 8, fontWeight: '500', cursor: 'pointer', fontSize: 14 }}
        >
          <span style={{ fontSize: 18, lineHieght: 1 }}>+</span> Add participant
        </button>
        <button 
          onClick={() => { setScanning(!scanning); setShowManualAdd(false); }} 
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: 8, fontWeight: '500', cursor: 'pointer', fontSize: 14 }}
        >
          <IconQR style={{ width: 16, height: 16 }} /> {scanning ? 'Stop Scanning' : 'Scan QR'}
        </button>
      </div>

      {/* Manual Input Drawer Area */}
      {showManualAdd && (
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: '600' }}>Select Teacher to Add</h4>
          <select 
            onChange={(e) => handleManualAddTeacher(e.target.value)}
            defaultValue=""
            style={{ width: '100%', maxWidth: 400, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
          >
            <option value="" disabled>Choose profile directory...</option>
            {teachers
              .filter(t => !workshopAttendance.some(a => a.teacherId === t.id))
              .map(t => (
                <option key={t.id} value={t.id}>{t.fullName} — {t.region || 'Global Space'}</option>
              ))
            }
          </select>
        </div>
      )}

      {/* Safe Camera Scanning Display Framework Panel */}
      {scanning && (
        <div style={{ background: '#000', padding: 20, borderRadius: 12, marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: '#fff', marginBottom: 12, fontSize: 14, fontWeight: '400' }}>Position teacher QR inside scanner window bounds</div>
          <div id="workshop-qr-engine" style={{ width: '100%', maxWidth: 300, aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', background: '#1e1e1e' }} />
          <button 
            onClick={() => setScanning(false)}
            style={{ marginTop: 14, background: '#ef4444', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: '500', fontSize: 13 }}
          >
            Close Scanner Lens
          </button>
        </div>
      )}

      {/* Main Attendance Records Tracking Grid Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 20px 16px 20px', fontSize: 18, fontWeight: '600', color: '#0f172a' }}>Attendance</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '8px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <div>Teacher</div>
          <div>{fmtDate(currentWorkshop.date).slice(5)}</div>
        </div>

        {workshopAttendance.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            No registered attendees logged for this session. Choose operational fields above to populate data.
          </div>
        ) : (
          workshopAttendance.map(rec => {
            const t = teachers.find(teacher => teacher.id === rec.teacherId)
            const displayLabel = t ? t.fullName : 'Unknown Profile'
            return (
              <div key={rec.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: '600', color: '#475569' }}>
                    {initials(displayLabel)}
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', color: '#0f172a', fontSize: 14 }}>{displayLabel}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{t?.region || 'No assigned region'}</div>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => handleToggleStatus(rec)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    {rec.status === 'present' ? (
                      <div style={{ background: '#2563eb', color: '#fff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck style={{ width: 14, height: 14 }} /></div>
                    ) : (
                      <div style={{ border: '2px solid #cbd5e1', width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Internal Notes & Session Logging Panel */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '600', color: '#0f172a' }}>Comments</h3>
        
        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Write a message or workshop note..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, outline: 'none' }}
          />
          <button 
            type="submit"
            style={{ background: '#0b4f9c', color: '#fff', border: 'none', padding: '0 20px', borderRadius: 8, fontWeight: '600', cursor: 'pointer', fontSize: 13 }}
          >
            Post Note
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(!currentWorkshop.comments || currentWorkshop.comments.length === 0) ? (
            <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>No session notes cataloged.</p>
          ) : (
            currentWorkshop.comments.map(c => (
              <div key={c.id} style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#334155' }}>{c.text}</p>
                <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginTop: 6 }}>
                  {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}