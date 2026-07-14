import QRCode from 'qrcode'
import * as XLSX from 'xlsx'

// ── IDs ─────────────────────────────────────────────────
export function uid() {
  return crypto.randomUUID()
}

export function makeTeacherId() {
  const yr = String(new Date().getFullYear()).slice(-2)
  const num = String(Math.floor(Math.random() * 90000 + 10000))
  return `TCH-${yr}-${num}`
}

// ── QR Code ─────────────────────────────────────────────
export async function makeQRCode(data) {
  return QRCode.toDataURL(JSON.stringify(data), {
    width: 260,
    margin: 2,
    color: { dark: '#1a5c3a', light: '#ffffff' },
  })
}

// ── Date formatting ──────────────────────────────────────
export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  })
}

export function fmtDateTime(iso) {
  return `${fmtDate(iso)} ${fmtTime(iso)}`
}

// ── Initials ─────────────────────────────────────────────
export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ── Excel export ─────────────────────────────────────────
export function exportAttendance(records, teachers, workshops) {
  const tMap = Object.fromEntries(teachers.map(t => [t.id, t]))
  const wMap = Object.fromEntries(workshops.map(w => [w.id, w]))

  const rows = records.map(r => ({
    'Teacher ID':   tMap[r.teacherId]?.teacherId ?? '—',
    'Full Name':    tMap[r.teacherId]?.fullName ?? '—',
    'Region':       tMap[r.teacherId]?.region ?? '—',
    'Bootcamp':     tMap[r.teacherId]?.bootcamp ?? '—',
    'Workshop':     wMap[r.workshopId]?.name ?? '—',
    'Workshop Date': fmtDate(wMap[r.workshopId]?.date),
    'Check-in':     fmtDateTime(r.checkInTime),
    'Status':       r.status,
    'Synced':       r.syncStatus === 'synced' ? 'Yes' : 'No',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance')
  XLSX.writeFile(wb, 'attendance-report.xlsx')
}

export function exportTeachers(teachers) {
  const rows = teachers.map(t => ({
    'Teacher ID': t.teacherId,
    'Full Name':  t.fullName,
    'Email':      t.email,
    'Phone':      t.phone,
    'Bootcamp':   t.bootcamp,
    'Region':     t.region,
    'Registered': fmtDate(t.createdAt),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Teachers')
  XLSX.writeFile(wb, 'teachers-list.xlsx')
}
