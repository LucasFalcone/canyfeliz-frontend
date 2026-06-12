import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Al montar, verifica si hay token guardado
  useEffect(() => {
    const token = localStorage.getItem('cf_token')
    if (!token) {
      setCargando(false)
      return
    }

    axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => setUsuario(r.data))
      .catch(() => localStorage.removeItem('cf_token'))
      .finally(() => setCargando(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await axios.post(
      `${API_URL}/auth/login`,
      { email, password }
    )

    localStorage.setItem('cf_token', data.token)
    setUsuario(data.usuario)

    return data.usuario
  }

  const logout = () => {
    localStorage.removeItem('cf_token')
    setUsuario(null)
  }

  // Inyecta el token en todas las requests de axios automáticamente
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(config => {
      const token = localStorage.getItem('cf_token')
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    return () => axios.interceptors.request.eject(interceptor)
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)