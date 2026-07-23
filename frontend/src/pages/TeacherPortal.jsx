import { useApp } from '../hooks/useAppState.jsx'
import { IconDownload, IconUser } from '../components/Icons.jsx'
import { fmtDate, initials } from '../utils/helpers.js'

export default function TeacherPortal() {
  const { state, logout } = useApp()
  const { user, teachers, attendance, workshops } = state

  // Find the logged-in teacher's profile details
  const profile = teachers.find(
    (t) => t.id === user.teacherId || t.email.toLowerCase() === user.email.toLowerCase()
  )

  // Find the teacher's check-ins
  const teacherAttendance = profile
    ? attendance.filter((a) => a.teacherId === profile.id)
    : []

  const handleDownload = () => {
    if (!profile) return
    const a = document.createElement('a')
    a.href = profile.qrCode
    a.download = `qr-${profile.teacherId}.png`
    a.click()
  }

  return (
    <div style={styles.portalContainer}>
      {/* Header bar */}
      <header style={styles.header}>
        <div style={styles.logoGroup}>
          <h1 style={styles.logoTitle}>Uncommon.org</h1>
          <span style={styles.logoBadge}>Teacher Portal</span>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>
          Sign Out
        </button>
      </header>

      {/* Main portal body */}
      <main style={styles.main}>
        {!profile ? (
          <div style={styles.noProfileCard}>
            <IconUser style={{ width: 48, height: 48, color: '#059669', marginBottom: 12 }} />
            <h3>Profile Pending</h3>
            <p>Your teacher registration is being processed by the system administration.</p>
          </div>
        ) : (
          <div style={styles.portalGrid}>
            
            {/* Left Column: Profile Card */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.avatar}>{initials(profile.fullName)}</div>
                <div>
                  <h2 style={styles.profileName}>{profile.fullName}</h2>
                  <span style={styles.profileRole}>Registered Participant</span>
                </div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.infoList}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Teacher Code</span>
                    <span style={styles.infoValue}>{profile.teacherId}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Email</span>
                    <span style={styles.infoValue}>{profile.email}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Phone</span>
                    <span style={styles.infoValue}>{profile.phone}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Bootcamp</span>
                    <span style={styles.infoValue}>{profile.bootcamp}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Region</span>
                    <span style={styles.infoValue}>{profile.region}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Registered Date</span>
                    <span style={styles.infoValue}>{fmtDate(profile.createdAt)}</span>
                  </div>
                  {profile.gender && (
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Gender</span>
                      <span style={styles.infoValue}><span style={{ textTransform: 'capitalize' }}>{profile.gender}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: QR Code Display */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Your Attendance QR Code</h3>
              <p style={styles.cardDescription}>Show this QR code to the instructor at each workshop session to record your attendance.</p>
              
              <div style={styles.qrContainer}>
                <div style={styles.qrWrapper}>
                  <img src={profile.qrCode} alt={`QR for ${profile.fullName}`} style={styles.qrImage} />
                  <code style={styles.qrToken}>{profile.id}</code>
                </div>

                <button onClick={handleDownload} style={styles.downloadBtn}>
                  <IconDownload /> Download PNG
                </button>
              </div>
            </div>

            {/* Bottom Row: Check-in History */}
            <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
              <h3 style={styles.cardTitle}>Your Training Check-ins ({teacherAttendance.length})</h3>
              {teacherAttendance.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>You haven't checked into any training sessions yet.</p>
                </div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>Workshop / Date</th>
                        <th style={styles.th}>Check-in Time</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherAttendance.map((a) => {
                        const ws = workshops.find((w) => w.id === a.workshopId)
                        return (
                          <tr key={a.id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 600 }}>{ws ? ws.name : 'Unknown Workshop'}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{a.attendanceDate}</div>
                            </td>
                            <td style={styles.td}>
                              {new Date(a.checkInTime).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td style={styles.td}>
                              <span style={a.status === 'present' ? styles.badgePresent : styles.badgeAbsent}>
                                {a.status}
                              </span>
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
        )}
      </main>
    </div>
  )
}

const styles = {
  portalContainer: {
    minHeight: '100vh',
    background: '#f8fafc',
    color: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
  },
  header: {
    background: '#1e3a8a',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoTitle: {
    margin: '0',
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '-0.02em'
  },
  logoBadge: {
    background: '#10b981',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '12px',
    textTransform: 'uppercase'
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    color: '#fff',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    outline: 'none',
    ':hover': {
      borderColor: '#fff',
      background: 'rgba(255, 255, 255, 0.1)'
    }
  },
  main: {
    flex: '1',
    maxWidth: '1000px',
    width: '100%',
    margin: '0 auto',
    padding: '32px 24px',
    boxSizing: 'border-box'
  },
  noProfileCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
  },
  portalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px'
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    boxSizing: 'border-box'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '16px',
    marginBottom: '16px'
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#10b981',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '18px'
  },
  profileName: {
    margin: '0',
    fontSize: '18px',
    fontWeight: '700'
  },
  profileRole: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500'
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column'
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    borderBottom: '1px dashed #f1f5f9',
    paddingBottom: '8px'
  },
  infoLabel: {
    color: '#64748b',
    fontWeight: '500'
  },
  infoValue: {
    fontWeight: '600'
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '700'
  },
  cardDescription: {
    margin: '0 0 20px 0',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5'
  },
  qrContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  qrWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    background: '#f8fafc'
  },
  qrImage: {
    width: '180px',
    height: '180px',
    marginBottom: '8px'
  },
  qrToken: {
    fontSize: '11px',
    color: '#64748b',
    background: '#e2e8f0',
    padding: '2px 8px',
    borderRadius: '4px',
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  downloadBtn: {
    background: '#1e3a8a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.2s',
    outline: 'none',
    ':hover': {
      background: '#1d4ed8'
    }
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px',
    color: '#64748b'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tableHeaderRow: {
    borderBottom: '2px solid #e2e8f0'
  },
  th: {
    padding: '12px 8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b'
  },
  tr: {
    borderBottom: '1px solid #f1f5f9'
  },
  td: {
    padding: '12px 8px',
    fontSize: '14px'
  },
  badgePresent: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  badgeAbsent: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'capitalize'
  }
}
