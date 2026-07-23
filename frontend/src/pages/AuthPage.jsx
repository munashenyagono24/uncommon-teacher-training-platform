import { useState } from 'react'
import { useApp } from '../hooks/useAppState.jsx'

// Updated from Provinces to Hubs/Bootcamps
const HUBS_AND_BOOTCAMPS = [
  'Mbare Innovation Hub', 
  'Highfield Innovation Hub',
  'Mufakose Innovation Hub',
  'Kambuzuma Innovation Hub',
  'Young Africa Chitungwiza Hub', 
  'Sally Foundation Innovation Hub', 
  'Dzikwa TrustInnovation Hub',
  'Nicki Keszker Innovation Hub', 
]

export default function AuthPage() {
  const { login, signup } = useApp()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('teacher')

  // Teacher Profile Fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bootcamp, setBootcamp] = useState('')
  const [region, setRegion] = useState('') // We keep the variable name 'region' to ensure backend compatibility, but the UI shows Hubs
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')

  const handleToggle = () => {
    setIsLogin(!isLogin)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        let profile = null
        if (role === 'teacher') {
          if (!fullName.trim() || !phone.trim() || !bootcamp.trim() || !region || !age || !gender) {
            throw new Error('Please fill in all teacher profile details.')
          }
          profile = {
            fullName: fullName.trim(),
            phone: phone.trim(),
            bootcamp: bootcamp.trim(),
            region, 
            age: parseInt(age, 10),
            gender
          }
        }
        await signup(email, password, role, profile)
      }
    } catch (err) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={styles.container}>
      <div className="auth-card" style={styles.card}>
        
        {/* Updated Branding Colors */}
        <div style={styles.header}>
          <div style={styles.logoIcon}>U</div>
          <h2 style={styles.title}>Uncommon.org</h2>
          <p style={styles.subtitle}>Teacher Training Portal</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group" style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@uncommon.org"
              style={styles.input}
              required
            />
          </div>

          <div className="form-group" style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group" style={styles.formGroup}>
                <label style={styles.label}>Portal Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={styles.select}
                >
                  <option value="teacher">Teacher / Participant</option>
                  <option value="admin">Instructor / Admin (Anesu)</option>
                </select>
              </div>

              {role === 'teacher' && (
                <div style={styles.profileSection}>
                  <h4 style={styles.profileTitle}>Complete Teacher Profile</h4>

                  <div className="form-group" style={styles.formGroup}>
                    <label style={styles.label}>Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Tariro Moyo"
                      style={styles.input}
                      required
                    />
                  </div>

                  <div className="form-group" style={styles.formGroup}>
                    <label style={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+263 77 123 4567"
                      style={styles.input}
                      required
                    />
                  </div>

                  <div className="form-group" style={styles.formGroup}>
                    <label style={styles.label}>Bootcamp Number/Name</label>
                    <input
                      type="text"
                      value={bootcamp}
                      onChange={(e) => setBootcamp(e.target.value)}
                      placeholder="e.g. Bootcamp 3"
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.row}>
                    <div className="form-group" style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.label}>Hub / Location</label>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        style={styles.select}
                        required
                      >
                        <option value="">Select Hub...</option>
                        {HUBS_AND_BOOTCAMPS.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ ...styles.formGroup, width: 80 }}>
                      <label style={styles.label}>Age</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 24"
                        style={styles.input}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group" style={styles.formGroup}>
                    <label style={styles.label}>Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={styles.select}
                      required
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Processing...' : isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" onClick={handleToggle} style={styles.toggleBtn}>
              {isLogin ? 'Register here' : 'Log in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// Completely Overhauled White & Blue Theme
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc', // Slate-50 (Clean light background)
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0', // Light slate border
    borderRadius: '16px',
    padding: '32px 40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    color: '#1e293b', // Dark slate text
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  logoIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    background: '#dbeafe', // Blue-100
    color: '#2563eb', // Blue-600
    borderRadius: '12px',
    fontSize: '24px',
    fontWeight: '800',
    marginBottom: '12px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    margin: '0',
    color: '#0f172a', // Slate-900
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b', // Slate-500
    margin: '4px 0 0',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#475569', // Slate-600
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  input: {
    background: '#f8fafc', // Slate-50
    border: '1px solid #cbd5e1', // Slate-300
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#1e293b', // Slate-800
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    width: '100%'
  },
  select: {
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    cursor: 'pointer'
  },
  profileSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  profileTitle: {
    margin: '0 0 4px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#2563eb', // Blue-600
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  row: {
    display: 'flex',
    gap: '12px'
  },
  submitBtn: {
    background: '#2563eb', // Blue-600
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '8px',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
  },
  error: {
    background: '#fef2f2', // Red-50
    border: '1px solid #fecaca', // Red-200
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#ef4444', // Red-500
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '16px',
    textAlign: 'center'
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px'
  },
  footerText: {
    fontSize: '13px',
    color: '#64748b', // Slate-500
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb', // Blue-600
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0',
    textDecoration: 'none'
  }
}