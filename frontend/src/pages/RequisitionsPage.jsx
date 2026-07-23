import { useState, useMemo } from 'react'
import { useApp } from '../hooks/useAppState.jsx'
import { uid, fmtDate } from '../utils/helpers.js'
import { IconPlus, IconX, IconSearch, IconTrash, IconDownload, IconEvent, IconLocation, IconReport, IconCheck } from '../components/Icons.jsx'

export default function RequisitionsPage() {
  const { state, addFundRequisition, removeFundRequisition, addLocation, addFacilitator, addMinistryContact, toast } = useApp()
  const { fundRequisitions, locations, facilitators, ministryContacts } = state

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRequisition, setEditingRequisition] = useState(null)
  const [selectedReq, setSelectedReq] = useState(null)

  // New states for page navigation and email validation
  const [currentView, setCurrentView] = useState('list') // 'list' | 'portal'
  const [emailError, setEmailError] = useState('')

  // Local state for the access portal inputs
  const [uncommonId, setUncommonId] = useState('')
  const [email, setEmail] = useState('')
  const [hubLocation, setHubLocation] = useState('')
  const [reason, setReason] = useState('')

  // Filter requisitions
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return [...fundRequisitions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter(r => {
        const matchQ = !q || r.title.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q)
        const matchStatus = !filterStatus || r.status === filterStatus
        return matchQ && matchStatus
      })
  }, [fundRequisitions, search, filterStatus])

  const handleDelete = async (req) => {
    if (!confirm(`Delete fund requisition "${req.title}"? This will also remove all budget line items.`)) return
    await removeFundRequisition(req.id)
    if (selectedReq?.id === req.id) setSelectedReq(null)
    toast(`"${req.title}" deleted`, 'info')
  }

  const handleEdit = (req) => {
    setEditingRequisition(req)
    setShowForm(true)
  }

  const handleCreateNew = () => {
    setEditingRequisition(null)
    setShowForm(true)
  }

  const handleSelectReq = (req) => {
    setSelectedReq(selectedReq?.id === req.id ? null : req)
  }

  const handleSendRequest = (e) => {
    e.preventDefault()
    
    // Check constraint for specific email domain
    if (!email.trim().toLowerCase().endsWith('@uncommon.org')) {
      setEmailError('invalid email')
      return
    }
    
    // Clear error if valid
    setEmailError('')
    toast('Access request submitted successfully to admin!', 'success')
    
    // TODO: Add your external finance system link redirect here
    // window.location.href = "https://your-external-finance-system-url.com";
  }

  // Helper mapping
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))
  const facilitatorMap = Object.fromEntries(facilitators.map(f => [f.id, f]))
  const contactMap = Object.fromEntries(ministryContacts.map(m => [m.id, m]))

  // --- VIEW 1: REQUISITIONS DASHBOARD / LIST ---
  if (currentView === 'list') {
    return (
      <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Funds Requisitions</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: '#64748b' }}>
              Search previous requisitions or request new funds.
            </p>
          </div>
          <button 
            onClick={() => setCurrentView('portal')}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1d4ed8', color: '#ffffff', 
              border: 'none', borderRadius: '8px', height: '40px', padding: '0 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' 
            }}
          >
            Create Requisition
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
          <input 
            type="text" 
            placeholder="Search for previous requisitions..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              width: '100%', height: '42px', padding: '0 14px', paddingLeft: '36px', 
              border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' 
            }}
          />
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
            <IconSearch />
          </div>
        </div>

        {/* Requisitions List */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              No requisitions found matching your search.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Title</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Requested By</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{req.title}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#475569' }}>{req.requestedBy}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#475569' }}>
                      {typeof fmtDate === 'function' ? fmtDate(req.createdAt) : req.createdAt.split('T')[0]}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
                        background: req.status === 'approved' ? '#dcfce7' : req.status === 'pending' ? '#fef08a' : '#f1f5f9',
                        color: req.status === 'approved' ? '#166534' : req.status === 'pending' ? '#854d0e' : '#475569'
                      }}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', textAlign: 'right' }}>
                      <button onClick={() => handleEdit(req)} style={{ marginRight: '12px', cursor: 'pointer', background: 'none', border: 'none', color: '#2563eb', fontWeight: '500' }}>Edit</button>
                      <button onClick={() => handleDelete(req)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#dc2626', fontWeight: '500' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modals trigger from the list view via Edit button */}
        {showForm && (
          <RequisitionModal
            onClose={() => setShowForm(false)}
            requisition={editingRequisition}
            addFundRequisition={addFundRequisition}
            locations={locations}
            addLocation={addLocation}
            facilitators={facilitators}
            addFacilitator={addFacilitator}
            ministryContacts={ministryContacts}
            addMinistryContact={addMinistryContact}
            toast={toast}
          />
        )}
      </div>
    )
  }

  // --- VIEW 2: REQUEST ACCESS PORTAL (Original View) ---
  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Back navigation */}
      <button 
        onClick={() => setCurrentView('list')}
        style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', 
          color: '#64748b', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '24px', padding: 0
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Requisitions
      </button>

      {/* Header matching screenshot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ 
          background: '#e8f2fc', 
          borderRadius: '12px', 
          width: '48px', 
          height: '48px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3" />
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>Funds Requisition</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Request access to the Operations & Finance app to add workshop funds.
          </p>
        </div>
      </div>

      {/* Access Portal Card layout matching screenshot */}
      <div className="card" style={{ 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '16px', 
        padding: '32px', 
        maxWidth: '680px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
      }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
          Request access portal
        </h3>

        <form onSubmit={handleSendRequest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Uncommon email ID</label>
            <input 
              type="text" 
              placeholder="e.g. anesu.m" 
              value={uncommonId}
              onChange={e => setUncommonId(e.target.value)}
              style={{ width: '100%', height: '42px', padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Email</label>
            <input 
              type="email" 
              placeholder="you@uncommon.org" 
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              style={{ 
                width: '100%', height: '42px', padding: '0 14px', 
                border: emailError ? '1px solid #ef4444' : '1px solid #cbd5e1', 
                borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' 
              }}
              required
            />
            {emailError && (
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>
                {emailError}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Hub location</label>
            <input 
              type="text" 
              placeholder="e.g. Harare Hub" 
              value={hubLocation}
              onChange={e => setHubLocation(e.target.value)}
              style={{ width: '100%', height: '42px', padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Reason (optional)</label>
            <textarea 
              placeholder="Brief context for the finance admin..." 
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', height: '96px', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <button 
              type="submit" 
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0a4a93', color: '#ffffff', 
                border: 'none', borderRadius: '8px', height: '40px', padding: '0 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' 
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send request to admin
            </button>

            <button 
              type="button" 
              style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff', color: '#64748b', 
                border: '1px solid #e2e8f0', borderRadius: '8px', height: '40px', padding: '0 18px', fontSize: '14px', fontWeight: '500', cursor: 'default' 
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Finance app link pending
            </button>
          </div>
        </form>

        <p style={{ margin: '20px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
          Funds are added from the external Operations & Finance app. Submitting this form emails the admin to grant you access.
        </p>
      </div>

      {showForm && (
        <RequisitionModal
          onClose={() => setShowForm(false)}
          requisition={editingRequisition}
          addFundRequisition={addFundRequisition}
          locations={locations}
          addLocation={addLocation}
          facilitators={facilitators}
          addFacilitator={addFacilitator}
          ministryContacts={ministryContacts}
          addMinistryContact={addMinistryContact}
          toast={toast}
        />
      )}
    </div>
  )
}

/* ── Requisition Creation/Edit Modal ────────────────────────────── */
function RequisitionModal({
  onClose, requisition, addFundRequisition,
  locations, addLocation,
  facilitators, addFacilitator,
  ministryContacts, addMinistryContact,
  toast
}) {
  const [title, setTitle] = useState(requisition?.title ?? '')
  const [requestedBy, setRequestedBy] = useState(requisition?.requestedBy ?? '')
  const [locationId, setLocationId] = useState(requisition?.locationId ?? '')
  const [startDate, setStartDate] = useState(requisition?.startDate ?? '')
  const [endDate, setEndDate] = useState(requisition?.endDate ?? '')
  const [currency, setCurrency] = useState(requisition?.currency ?? 'USD')
  const [notes, setNotes] = useState(requisition?.notes ?? '')
  const [status, setStatus] = useState(requisition?.status ?? 'draft')
  
  const [facilitatorIds, setFacilitatorIds] = useState(requisition?.facilitatorIds ?? [])
  const [ministryContactIds, setMinistryContactIds] = useState(requisition?.ministryContactIds ?? [])
  
  const [lineItems, setLineItems] = useState(requisition?.lineItems ?? [])
  const [errors, setErrors] = useState({})

  // Inline forms states
  const [showLocForm, setShowLocForm] = useState(false)
  const [locForm, setLocForm] = useState({ name: '', region: '', address: '' })

  const [showFacForm, setShowFacForm] = useState(false)
  const [facForm, setFacForm] = useState({ name: '', email: '', phone: '', role: '', organization: '' })

  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', title: '', ministry: '', email: '', phone: '' })

  // Calculator
  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitCost || 0)), 0)
  }, [lineItems])

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: uid(), category: 'Accommodation', description: '', quantity: 1, unitCost: 0, amount: 0 }])
  }

  const handleUpdateLineItem = (id, key, val) => {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [key]: val }
      if (key === 'quantity' || key === 'unitCost') {
        const q = key === 'quantity' ? Number(val) : Number(item.quantity)
        const u = key === 'unitCost' ? Number(val) : Number(item.unitCost)
        updated.amount = q * u
      }
      return updated
    }))
  }

  const handleRemoveLineItem = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  // Inline adds
  const handleAddLocation = async () => {
    if (!locForm.name.trim()) return alert('Location name is required')
    const loc = { id: uid(), name: locForm.name.trim(), region: locForm.region, address: locForm.address, createdAt: new Date().toISOString() }
    await addLocation(loc)
    setLocationId(loc.id)
    setShowLocForm(false)
    setLocForm({ name: '', region: '', address: '' })
    toast(`Location "${loc.name}" created`)
  }

  const handleAddFacilitator = async () => {
    if (!facForm.name.trim()) return alert('Name is required')
    const fac = { id: uid(), name: facForm.name.trim(), email: facForm.email, phone: facForm.phone, role: facForm.role, organization: facForm.organization, createdAt: new Date().toISOString() }
    await addFacilitator(fac)
    setFacilitatorIds([...facilitatorIds, fac.id])
    setShowFacForm(false)
    setFacForm({ name: '', email: '', phone: '', role: '', organization: '' })
    toast(`Facilitator "${fac.name}" registered`)
  }

  const handleAddContact = async () => {
    if (!contactForm.name.trim()) return alert('Name is required')
    const mc = { id: uid(), name: contactForm.name.trim(), title: contactForm.title, ministry: contactForm.ministry, email: contactForm.email, phone: contactForm.phone, createdAt: new Date().toISOString() }
    await addMinistryContact(mc)
    setMinistryContactIds([...ministryContactIds, mc.id])
    setShowContactForm(false)
    setContactForm({ name: '', title: '', ministry: '', email: '', phone: '' })
    toast(`Ministry contact "${mc.name}" created`)
  }

  const handleToggleFacilitator = (fid) => {
    if (facilitatorIds.includes(fid)) {
      setFacilitatorIds(facilitatorIds.filter(id => id !== fid))
    } else {
      setFacilitatorIds([...facilitatorIds, fid])
    }
  }

  const handleToggleContact = (cid) => {
    if (ministryContactIds.includes(cid)) {
      setMinistryContactIds(ministryContactIds.filter(id => id !== cid))
    } else {
      setMinistryContactIds([...ministryContactIds, cid])
    }
  }

  const validate = () => {
    const e = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!requestedBy.trim()) e.requestedBy = 'Requester name is required'
    if (!startDate) e.startDate = 'Start date is required'
    if (!locationId) e.locationId = 'Select a venue location'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const id = requisition?.id || uid()
    const now = new Date().toISOString()
    const payload = {
      id,
      title: title.trim(),
      requestedBy: requestedBy.trim(),
      locationId,
      startDate,
      endDate: endDate || startDate,
      currency,
      totalAmount,
      notes: notes.trim(),
      status,
      facilitatorIds,
      ministryContactIds,
      lineItems: lineItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        amount: Number(item.quantity) * Number(item.unitCost)
      })),
      createdAt: requisition?.createdAt || now,
      updatedAt: now
    }
    await addFundRequisition(payload)
    toast(requisition ? 'Requisition updated' : 'Requisition compiled successfully')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 840, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>{requisition ? 'Edit Budget Requisition' : 'Compile Budget Requisition'}</h3>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', paddingRight: 10 }}>
          {/* Main Info */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Requisition Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })) }}
                placeholder="e.g. Harare Term 2 Pedagogy Budget" 
                className={errors.title ? 'input-error' : ''}
              />
              {errors.title && <span className="error-msg">{errors.title}</span>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Requested By</label>
              <input 
                type="text" 
                value={requestedBy} 
                onChange={e => { setRequestedBy(e.target.value); setErrors(p => ({ ...p, requestedBy: '' })) }}
                placeholder="Anesu" 
                className={errors.requestedBy ? 'input-error' : ''}
              />
              {errors.requestedBy && <span className="error-msg">{errors.requestedBy}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => { setStartDate(e.target.value); setErrors(p => ({ ...p, startDate: '' })) }}
                className={errors.startDate ? 'input-error' : ''}
              />
              {errors.startDate && <span className="error-msg">{errors.startDate}</span>}
            </div>
            <div className="form-group">
              <label>End Date (Optional)</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="ZiG">ZiG</option>
                <option value="ZAR">ZAR (R)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          {/* Location Section */}
          <div className="form-group" style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, border: '1px dashed #ced4da', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ margin: 0, fontWeight: 700 }}>Venue Location</label>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '3px 8px', fontSize: 11 }} 
                onClick={() => setShowLocForm(!showLocForm)}
              >
                {showLocForm ? 'Cancel' : '+ New Location'}
              </button>
            </div>

            {showLocForm ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: '#fff', padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
                <input 
                  type="text" 
                  value={locForm.name} 
                  onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                  placeholder="Harare Central Library" 
                  style={{ flex: 1, minWidth: 150, padding: 6, fontSize: 13 }}
                />
                <input 
                  type="text" 
                  value={locForm.region} 
                  onChange={e => setLocForm({ ...locForm, region: e.target.value })}
                  placeholder="Region (e.g. Harare)" 
                  style={{ flex: 1, minWidth: 120, padding: 6, fontSize: 13 }}
                />
                <input 
                  type="text" 
                  value={locForm.address} 
                  onChange={e => setLocForm({ ...locForm, address: e.target.value })}
                  placeholder="Address details" 
                  style={{ flex: 2, minWidth: 180, padding: 6, fontSize: 13 }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddLocation}>Add Location</button>
              </div>
            ) : (
              <select 
                value={locationId} 
                onChange={e => { setLocationId(e.target.value); setErrors(p => ({ ...p, locationId: '' })) }}
                className={errors.locationId ? 'input-error' : ''}
              >
                <option value="">Select workshop location venue…</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.region})</option>
                ))}
              </select>
            )}
            {errors.locationId && <span className="error-msg">{errors.locationId}</span>}
          </div>

          {/* People involved select checklists */}
          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            {/* Facilitators Checklist */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Select Facilitators</span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setShowFacForm(!showFacForm)}
                >
                  {showFacForm ? 'Cancel' : '+ New Facilitator'}
                </button>
              </div>

              {showFacForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8f9fa', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8 }}>
                  <input type="text" placeholder="Full Name" value={facForm.name} onChange={e => setFacForm({ ...facForm, name: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Role (e.g. Lead Facilitator)" value={facForm.role} onChange={e => setFacForm({ ...facForm, role: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Organization" value={facForm.organization} onChange={e => setFacForm({ ...facForm, organization: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddFacilitator}>Save Facilitator</button>
                </div>
              ) : null}

              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {facilitators.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>No facilitators registered yet.</span>
                ) : (
                  facilitators.map(fac => (
                    <label key={fac.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={facilitatorIds.includes(fac.id)}
                        onChange={() => handleToggleFacilitator(fac.id)}
                      />
                      {fac.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({fac.role || 'Facilitator'})</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Ministry Contacts Checklist */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Select Ministry Contacts</span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setShowContactForm(!showContactForm)}
                >
                  {showContactForm ? 'Cancel' : '+ New Delegate'}
                </button>
              </div>

              {showContactForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8f9fa', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8 }}>
                  <input type="text" placeholder="Full Name" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Title (e.g. Provincial Officer)" value={contactForm.title} onChange={e => setContactForm({ ...contactForm, title: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Ministry" value={contactForm.ministry} onChange={e => setContactForm({ ...contactForm, ministry: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Email" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <input type="text" placeholder="Phone" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddContact}>Save Contact</button>
                </div>
              ) : null}

              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ministryContacts.length === 0 ? (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>No ministry contacts registered yet.</span>
                ) : (
                  ministryContacts.map(mc => (
                    <label key={mc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={ministryContactIds.includes(mc.id)}
                        onChange={() => handleToggleContact(mc.id)}
                      />
                      {mc.name} <span style={{ color: 'var(--muted)', fontSize: 11 }}>({mc.title || 'Delegate'})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Budget Line Items */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Budget Line Items</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLineItem}>+ Add Line Item</button>
            </div>
            {lineItems.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>No budget items added yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lineItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select value={item.category} onChange={e => handleUpdateLineItem(item.id, 'category', e.target.value)} style={{ padding: 6, fontSize: 12, width: 130 }}>
                      <option value="Accommodation">Accommodation</option>
                      <option value="Catering">Catering</option>
                      <option value="Transport">Transport</option>
                      <option value="Material">Material</option>
                      <option value="Other">Other</option>
                    </select>
                    <input type="text" placeholder="Description" value={item.description} onChange={e => handleUpdateLineItem(item.id, 'description', e.target.value)} style={{ flex: 2, padding: 6, fontSize: 12 }} />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleUpdateLineItem(item.id, 'quantity', e.target.value)} style={{ width: 60, padding: 6, fontSize: 12, textAlign: 'right' }} />
                    <input type="number" placeholder="Unit Cost" value={item.unitCost} onChange={e => handleUpdateLineItem(item.id, 'unitCost', e.target.value)} style={{ width: 80, padding: 6, fontSize: 12, textAlign: 'right' }} />
                    <div style={{ width: 80, fontSize: 12, fontWeight: 600, textAlign: 'right', paddingRight: 4 }}>
                      {(item.quantity * item.unitCost).toFixed(2)}
                    </div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveLineItem(item.id)} style={{ padding: '4px 8px' }}><IconTrash /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Notes / Context</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Provide additional details or justifications..." rows={3} />
          </div>

          {/* Total Estimated Budget summary banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)', padding: '12px 16px', borderRadius: 8, marginBottom: 16 }}>
            <span style={{ fontWeight: 600 }}>Total Estimated Budget:</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green-dark)' }}>
              {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {requisition ? 'Update Requisition' : 'Save Requisition'}
          </button>
        </div>
      </div>
    </div>
  )
}