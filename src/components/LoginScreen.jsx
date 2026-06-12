import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen() {
  const { login } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [cargando, setCargando] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={styles.pantalla}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <span style={{ fontSize: 48 }}>🐾</span>
          <h1 style={styles.titulo}>CanyFeliz</h1>
          <p style={styles.subtitulo}>Sistema de Punto de Venta</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@canyfeliz.com"
            required
            autoFocus
          />

          <label style={styles.label}>Contraseña</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.btnLogin} type="submit" disabled={cargando}>
            {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p style={styles.hint}>
          Prueba: admin@canyfeliz.com / canyfeliz123
        </p>
      </div>
    </div>
  )
}

const styles = {
  pantalla: {
    minHeight: '100vh', background: '#f0fdf4',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: 'white', borderRadius: 16, padding: '36px 32px',
    width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logoArea: { textAlign: 'center', marginBottom: 28 },
  titulo:   { fontSize: 24, fontWeight: 800, color: '#15803d', margin: '8px 0 4px' },
  subtitulo:{ fontSize: 13, color: '#6b7280' },
  form:     { display: 'flex', flexDirection: 'column', gap: 6 },
  label:    { fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 8 },
  input:    {
    padding: '10px 12px', borderRadius: 8, fontSize: 14,
    border: '1.5px solid #d1fae5', outline: 'none',
  },
  error:    { color: '#dc2626', fontSize: 13, marginTop: 4 },
  btnLogin: {
    marginTop: 16, padding: 12, borderRadius: 8, border: 'none',
    background: '#16a34a', color: 'white', fontSize: 15,
    fontWeight: 700, cursor: 'pointer',
  },
  hint: { textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 20 },
}