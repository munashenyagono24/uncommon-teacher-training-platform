import { useState, useMemo } from 'react'
import { useApp } from '../hooks/useAppState.jsx'
import { exportAttendance, fmtDate } from '../utils/helpers.js'
import { IconDownload, IconReport } from '../components/Icons.jsx'

export default function ReportsPage() {
  const { state } = useApp()
  const { teachers, workshops, attendance } = state

  const [selectedWorkshopId, setSelectedWorkshopId] = useState('')
  const [comments, setComments] = useState('')

  const teacherMap = useMemo(() => Object.fromEntries(teachers.map(t => [t.id, t])), [teachers])
  
  // Get selected workshop
  const selectedWorkshop = useMemo(() => {
    return workshops.find(w => w.id === selectedWorkshopId) || null
  }, [selectedWorkshopId, workshops])

  // Filter attendance just for the selected workshop
  const workshopAttendance = useMemo(() => {
    if (!selectedWorkshopId) return []
    return attendance.filter(rec => rec.workshopId === selectedWorkshopId)
  }, [attendance, selectedWorkshopId])

  // Calculate top-level metrics
  const metrics = useMemo(() => {
    if (!selectedWorkshop) return null

    // For a real app, "Expected" might come from a specific cohort. 
    // Here we use total teachers as a baseline, or a derived number.
    const expected = teachers.length > 0 ? teachers.length : 40 
    
    // Unique teachers who showed up
    const uniqueTeacherIds = new Set(workshopAttendance.map(a => a.teacherId))
    const registered = uniqueTeacherIds.size

    // Total present marks
    const presentMarks = workshopAttendance.filter(a => a.status === 'present').length

    // Average attendance rate
    const avgRate = expected > 0 ? Math.round((presentMarks / expected) * 100) : 0

    return { expected, registered, presentMarks, avgRate }
  }, [selectedWorkshop, workshopAttendance, teachers.length])

  // Aggregate daily stats for the table
  const dailyStats = useMemo(() => {
    if (!selectedWorkshopId || workshopAttendance.length === 0) return []

    const days = {}

    workshopAttendance.forEach(rec => {
      // Group by date (using checkInTime or workshop date)
      const day = rec.checkInTime ? rec.checkInTime.split('T')[0] : 'Unknown Date'
      
      if (!days[day]) {
        days[day] = { present: 0, absent: 0, totalAge: 0, ageCount: 0, genders: { male: 0, female: 0 } }
      }

      const t = teacherMap[rec.teacherId]

      if (rec.status === 'present') {
        days[day].present += 1
      } else {
        days[day].absent += 1
      }

      if (t) {
        if (t.age) {
          days[day].totalAge += Number(t.age)
          days[day].ageCount += 1
        }
        if (t.gender) {
          const g = t.gender.toLowerCase()
          if (days[day].genders[g] !== undefined) {
            days[day].genders[g] += 1
          } else {
            days[day].genders[g] = 1
          }
        }
      }
    })

    // Format into an array for the table
    return Object.entries(days).map(([day, data]) => {
      const total = data.present + data.absent
      const rate = total > 0 ? Math.round((data.present / metrics.expected) * 100) : 0
      const avgAge = data.ageCount > 0 ? Math.round(data.totalAge / data.ageCount) : 0
      
      const genderStr = Object.entries(data.genders)
        .filter(([_, count]) => count > 0)
        .map(([g, count]) => `${g}: ${count}`)
        .join(', ') || '—'

      return {
        day,
        present: data.present,
        absent: data.absent,
        rate,
        avgAge,
        genderStr
      }
    }).sort((a, b) => b.day.localeCompare(a.day))
  }, [workshopAttendance, teacherMap, selectedWorkshopId, metrics?.expected])

  const handleExport = () => {
    // Pass the filtered records, teachers, workshops, and comments to your export helper
    exportAttendance(workshopAttendance, teachers, workshops, comments)
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header section matching screenshot */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: '#1e3a8a' }}>Reports</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: '#64748b' }}>
          Export any workshop's full data and displayed metrics to Excel.
        </p>
      </div>

      {/* Main Card */}
      <div style={{ 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '16px', 
        padding: '32px', 
        maxWidth: '800px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
          Export a workshop
        </h3>

        {/* Dropdown and Export Button Row */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Select workshop</label>
            <select 
              value={selectedWorkshopId} 
              onChange={(e) => setSelectedWorkshopId(e.target.value)}
              style={{ 
                width: '100%', height: '44px', padding: '0 14px', 
                border: '1px solid #cbd5e1', borderRadius: '8px', 
                fontSize: '15px', color: '#334155', backgroundColor: '#fff',
                outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="">Choose a workshop...</option>
              {workshops.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.date ? `— ${fmtDate(w.date)}` : ''}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={handleExport}
            disabled={!selectedWorkshopId}
            style={{ 
              height: '44px', 
              padding: '0 24px', 
              backgroundColor: selectedWorkshopId ? '#1e40af' : '#94a3b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '15px', 
              fontWeight: '600', 
              cursor: selectedWorkshopId ? 'pointer' : 'not-allowed',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap', // Prevents text from breaking into multiple lines
              transition: 'background 0.2s'
            }}
          >
            {/* Wrapper forces the SVG icon to remain appropriately sized */}
            <span style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconDownload />
            </span>
            Export to Excel
          </button>
        </div>

        {/* Conditional Rendering: Metrics and Table when a workshop is selected */}
        {selectedWorkshopId && metrics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* 2x2 Grid Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <StatCard value={metrics.registered} label="Registered" />
              <StatCard value={metrics.expected} label="Expected" />
              <StatCard value={metrics.presentMarks} label="Present marks" />
              <StatCard value={`${metrics.avgRate}%`} label="Avg rate" />
            </div>

            {/* Daily Breakdown Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={thStyle}>Day</th>
                    <th style={thStyle}>Present</th>
                    <th style={thStyle}>Absent</th>
                    <th style={thStyle}>Rate</th>
                    <th style={thStyle}>Avg age</th>
                    <th style={thStyle}>Gender</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.length > 0 ? (
                    dailyStats.map((stat, idx) => (
                      <tr key={idx} style={{ borderBottom: idx !== dailyStats.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={tdStyle}>{stat.day}</td>
                        <td style={tdStyle}>{stat.present}</td>
                        <td style={tdStyle}>{stat.absent}</td>
                        <td style={tdStyle}>{stat.rate}%</td>
                        <td style={tdStyle}>{stat.avgAge}</td>
                        <td style={tdStyle}>{stat.genderStr}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                        No attendance data recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Comments Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Instructor Comments (Included in export)</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any specific notes or observations about this workshop here..."
                style={{
                  width: '100%', minHeight: '80px', padding: '12px 14px',
                  border: '1px solid #cbd5e1', borderRadius: '8px',
                  fontSize: '14px', color: '#334155', fontFamily: 'inherit',
                  resize: 'vertical', outline: 'none'
                }}
              />
            </div>

            {/* Footer Text */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
              <IconReport /> 
              <span>Export includes Summary, Attendance matrix, Participants, and Comments sheets.</span>
            </div>
            
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-component for the new metric boxes
function StatCard({ value, label }) {
  return (
    <div style={{ 
      border: '1px solid #e2e8f0', 
      borderRadius: '12px', 
      padding: '20px 24px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center',
      backgroundColor: '#ffffff'
    }}>
      <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e3a8a', lineHeight: '1.2' }}>
        {value}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#64748b', marginTop: '4px' }}>
        {label}
      </div>
    </div>
  )
}

// Helper styles for the table
const thStyle = {
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: '700',
  color: '#0f172a'
}

const tdStyle = {
  padding: '16px',
  fontSize: '14px',
  color: '#334155'
}