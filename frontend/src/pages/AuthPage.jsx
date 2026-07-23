import { useState } from 'react'
import { useApp } from '../hooks/useAppState.jsx'

const REGIONS = [
  'Harare', 'Bulawayo', 'Manicaland',
  'Mashonaland Central', 'Mashonaland East', 'Mashonaland West',
  'Masvingo', 'Matabeleland North', 'Matabeleland South', 'Midlands'
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

  // Teacher Profile Fields (For Teacher Signup)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bootcamp, setBootcamp] = useState('')
  const [region, setRegion] = useState('')
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
        <div style={styles.header}>
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
                      placeholder="e.g. tariro moyo"
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
                    <label style={styles.label}>Bootcamp</label>
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
                      <label style={styles.label}>Region</label>
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        style={styles.select}
                        required
                      >
                        <option value="">Select...</option>
                        {REGIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
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
            <button onClick={handleToggle} style={styles.toggleBtn}>
              {isLogin ? 'Register here' : 'Log in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 10% 20%, #064e3b 0%, #0f172a 90%)',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
  },
  card: {
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '16px',
    padding: '32px 40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    color: '#fff',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    margin: '0',
    color: '#34d399',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
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
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  input: {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    width: '100%'
  },
  select: {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
    cursor: 'pointer'
  },
  profileSection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
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
    color: '#34d399',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  row: {
    display: 'flex',
    gap: '12px'
  },
  submitBtn: {
    background: '#059669',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.1s',
    marginTop: '8px'
  },
  error: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#fca5a5',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '16px',
    textAlign: 'center'
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px'
  },
  footerText: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.5)',
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#34d399',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '0',
    textDecoration: 'underline'
  }
}
