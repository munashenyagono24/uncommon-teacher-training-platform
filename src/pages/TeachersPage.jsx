import { useState, useMemo } from 'react'
import { useApp } from '../hooks/useAppState.jsx'

import { uid, makeTeacherId, makeQRCode, exportTeachers, fmtDate, initials } from '../utils/helpers.js'
import { IconPlus, IconX, IconSearch, IconDownload, IconEye, IconTrash, IconUser } from '../components/Icons.jsx'

const REGIONS = [
  'Harare','Bulawayo','Manicaland',
  'Mashonaland Central','Mashonaland East','Mashonaland West',
  'Masvingo','Matabeleland North','Matabeleland South','Midlands',
]

export default function TeachersPage() {
  const { state, addTeacher, removeTeacher, toast } = useApp()
  const { teachers, attendance } = state

  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [viewTeacher, setViewTeacher] = useState(null)

  // Filtered list
  const filtered = useMemo(() => {
    return teachers.filter(t => {
      const q = search.toLowerCase()
      const matchQ = !q || t.fullName.toLowerCase().includes(q) || t.teacherId.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
      const matchR = !filterRegion || t.region === filterRegion
      return matchQ && matchR
    })
  }, [teachers, search, filterRegion])

  const handleDelete = async (t) => {
    if (!confirm(`Remove ${t.fullName} from the system?`)) return
    await removeTeacher(t.id)
    toast(`${t.fullName} removed`, 'info')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Teachers</h2>
          <p>{teachers.length} registered · each with a permanent QR code</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => exportTeachers(teachers)}>
            <IconDownload /> Export
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <IconPlus /> Register Teacher
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filter bar */}
        <div className="filter-bar">
          <div className="search-wrap">
            <IconSearch />
            <input
              type="text"
              placeholder="Search by name, ID or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} style={{ width: 180 }}>
            <option value="">All Regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <IconUser />
            <h3>{teachers.length === 0 ? 'No teachers yet' : 'No results found'}</h3>
            <p>{teachers.length === 0
              ? 'Register your first teacher to get started.'
              : 'Try adjusting your search or filter.'}
            </p>
            {teachers.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <IconPlus /> Register Teacher
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Teacher ID</th>
                  <th>Contact</th>
                  <th>Bootcamp</th>
                  <th>Region</th>
                  <th>Check-ins</th>
                  <th>Registered</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const checkins = attendance.filter(a => a.teacherId === t.id).length
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: 'var(--green-dark)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 13, flexShrink: 0,
                          }}>
                            {initials(t.fullName)}
                          </div>
                          <span className="td-name">{t.fullName}</span>
                        </div>
                      </td>
                      <td><code style={{ fontSize: 12 }}>{t.teacherId}</code></td>
                      <td>
                        <div className="td-name" style={{ fontSize: 13 }}>{t.email}</div>
                        <div className="td-sub">{t.phone}</div>
                      </td>
                      <td>{t.bootcamp}</td>
                      <td><span className="badge badge-green">{t.region}</span></td>
                      <td><strong>{checkins}</strong></td>
                      <td className="td-sub">{fmtDate(t.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setViewTeacher(t)}>
                            <IconEye />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t)}>
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register modal */}
      {showForm && <RegisterModal onClose={() => setShowForm(false)} addTeacher={addTeacher} toast={toast} />}

      {/* View modal */}
      {viewTeacher && <ViewModal teacher={viewTeacher} onClose={() => setViewTeacher(null)} />}
    </div>
  )
}

/* ── Register Modal ─────────────────────────────────── */
function RegisterModal({ onClose, addTeacher, toast }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', bootcamp: '', region: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.fullName.trim())   e.fullName = 'Required'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email required'
    if (!form.phone.trim())      e.phone = 'Required'
    if (!form.bootcamp.trim())   e.bootcamp = 'Required'
    if (!form.region)            e.region = 'Select a region'
    setErrors(e)
    return Object.keys(e).length === 0
  }


  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const id = uid()
      const teacherId = makeTeacherId()
      const qrCode = await makeQRCode({ id, teacherId })
      await addTeacher({ id, teacherId, qrCode, createdAt: new Date().toISOString(), ...form })
      toast(`${form.fullName} registered successfully`)
      onClose()
    } catch (error) {
      console.error(error)
      toast('Registration failed', 'error')
    } finally {
      setLoading(false)
    }
  }









  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Register New Teacher</h3>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: -6 }}>
            Teachers register once and receive a permanent QR code for all future workshops.
          </p>

          <div className="form-row">
            <Field label="Full Name" error={errors.fullName}>
              <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                placeholder="e.g. Tariro Moyo" className={errors.fullName ? 'input-error' : ''} />
            </Field>
            <Field label="Email Address" error={errors.email}>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="tariro@school.co.zw" className={errors.email ? 'input-error' : ''} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Phone Number" error={errors.phone}>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+263 77 123 4567" className={errors.phone ? 'input-error' : ''} />
            </Field>
            <Field label="Bootcamp" error={errors.bootcamp}>
              <input type="text" value={form.bootcamp} onChange={e => set('bootcamp', e.target.value)}
                placeholder="e.g. Bootcamp 3" className={errors.bootcamp ? 'input-error' : ''} />
            </Field>
          </div>
          <Field label="Region" error={errors.region}>
            <select value={form.region} onChange={e => set('region', e.target.value)}
              className={errors.region ? 'input-error' : ''}>
              <option value="">Select region…</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Registering…' : 'Register Teacher'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── View Teacher Modal ──────────────────────────────── */
function ViewModal({ teacher, onClose }) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = teacher.qrCode
    a.download = `qr-${teacher.teacherId}.png`
    a.click()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Teacher Profile</h3>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--green-dark)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 18,
                }}>
                  {initials(teacher.fullName)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{teacher.fullName}</div>
                  <code style={{ fontSize: 12, color: 'var(--muted)' }}>{teacher.teacherId}</code>
                </div>
              </div>

              {[
                ['Email',    teacher.email],
                ['Phone',    teacher.phone],
                ['Bootcamp', teacher.bootcamp],
                ['Region',   teacher.region],
                ['Registered', fmtDate(teacher.createdAt)],
              ].map(([label, val]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* QR Code */}
            <div className="qr-box" style={{ flex: '0 0 auto' }}>
              <img src={teacher.qrCode} alt={`QR for ${teacher.fullName}`} />
              <div className="teacher-id-code">{teacher.teacherId}</div>
              <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
                <IconDownload /> Download QR
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ── Field helper ────────────────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      {children}
      {error && <span className="error-msg">{error}</span>}
    </div>
  )
}
