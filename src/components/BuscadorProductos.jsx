import { useState, useRef, useEffect } from 'react'
import { buscarProductos } from '../api/api'
import { CATEGORIAS, SUBCATEGORIAS, tieneSubcategorias } from '../utils/categorias'
import { useIsMobile } from '../hooks/useIsMobile'


export default function BuscadorProductos({ onAgregar, accent = {} }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [categoria, setCategoria] = useState('todas')
  const [subcategoria, setSubcategoria] = useState('')
  const [etiqueta, setEtiqueta] = useState('')

  const isMobile = useIsMobile()

  const ac = {
    border: accent.border || '#d1fae5',
    borderFocus: accent.borderFocus || '#16a34a',
    badgeText: accent.badgeText || '#15803d',
  }

  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setCargando(true)
      setError(null)

      try {
        const cat = categoria === 'todas' ? null : categoria

        const data = await buscarProductos(
          query,
          cat,
          subcategoria || null,
          etiqueta || null
        )

        setResultados(data)

      } catch {
        setError('Error al buscar productos')

      } finally {
        setCargando(false)
      }
    }, query.trim() ? 300 : 0)

    return () => clearTimeout(timerRef.current)

  }, [query, categoria, subcategoria, etiqueta])

  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter' || !query.trim()) return

    e.preventDefault()
    setCargando(true)

    try {
      const cat = categoria === 'todas' ? null : categoria

      const data = await buscarProductos(
        query,
        cat,
        subcategoria || null,
        etiqueta || null
      )

      if (data.length === 1) {
        onAgregar(data[0])
        setQuery('')

      } else if (data.length === 0) {
        setError('Producto no encontrado')
      }

    } catch {
      setError('Error al buscar')

    } finally {
      setCargando(false)
    }
  }

  const seleccionar = (producto) => {
    onAgregar(producto)
    setQuery('')
    if (!isMobile) inputRef.current?.focus()
  }

  const etiquetasDisponibles = [...new Set(
    resultados
      .map(p => p.etiqueta)
      .filter(Boolean)
  )]

  return (
    <div style={{ position: 'relative' }}>

      {/* Chips de categoría */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        <button
          style={{
            ...styles.catChip,
            ...(categoria === 'todas'
              ? {
                ...styles.catChipOn,
                background: ac.borderFocus,
                border: `1px solid ${ac.borderFocus}`,
              }
              : {}),
          }}

          onClick={() => {
            setCategoria('todas')
            setSubcategoria('')
            setEtiqueta('')
          }}
        >
          Todas
        </button>

        {CATEGORIAS.map(c => (
          <button
            key={c.value}

            style={{
              ...styles.catChip,
              ...(categoria === c.value
                ? {
                  ...styles.catChipOn,
                  background: ac.borderFocus,
                  border: `1px solid ${ac.borderFocus}`,
                }
                : {}),
            }}

            onClick={() => {
              setCategoria(c.value)
              setSubcategoria('')
              setEtiqueta('')
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Chips de subcategoría */}
      {tieneSubcategorias(categoria) && categoria !== 'farmacia' && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          <button
            style={{
              ...styles.subChip,
              ...(subcategoria === ''
                ? styles.subChipOn
                : {}),
            }}

            onClick={() => setSubcategoria('')}
          >
            Todas
          </button>

          {SUBCATEGORIAS[categoria].map(sub => (
            <button
              key={sub.value}

              style={{
                ...styles.subChip,
                ...(subcategoria === sub.value
                  ? styles.subChipOn
                  : {}),
              }}

              onClick={() => setSubcategoria(sub.value)}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Chips de etiqueta — solo farmacia */}
      {categoria === 'farmacia' && etiquetasDisponibles.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
          <button
            style={{
              ...styles.subChip,
              ...(etiqueta === ''
                ? styles.subChipOn
                : {}),
            }}

            onClick={() => setEtiqueta('')}
          >
            Todas
          </button>

          {etiquetasDisponibles.map(e => (
            <button
              key={e}

              style={{
                ...styles.subChip,
                ...(etiqueta === e
                  ? styles.subChipOn
                  : {}),
              }}

              onClick={() => setEtiqueta(e)}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input de búsqueda */}
      <div
        style={{
          ...styles.inputWrapper,
          border: `2px solid ${ac.borderFocus}`,
        }}
      >

        <span style={styles.icon}>🔍</span>

        <input
          ref={inputRef}
          type="search"
          name="producto_busqueda"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          style={styles.input}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nombre o escanear código..."
        />

        {cargando && (
          <span style={styles.spinner}>⏳</span>
        )}
      </div>

      {error && (
        <p style={styles.error}>{error}</p>
      )}

      {/* Lista de resultados */}
      <ul style={styles.lista}>
        {resultados.length === 0 && !cargando && (
          <li style={{
            padding: '12px 14px',
            color: '#9ca3af',
            fontSize: 13,
          }}>
            {error || 'Sin productos en esta categoría'}
          </li>
        )}

        {resultados.map(p => (
          <li
            key={p.id}
            style={styles.listaItem}

            onClick={() => seleccionar(p)}

            onMouseEnter={e =>
              e.currentTarget.style.background = accent.hover || '#f9fafb'
            }

            onMouseLeave={e =>
              e.currentTarget.style.background = 'white'
            }
          >
            {/* Imagen */}
            {p.imagen_url ? (
              <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${p.imagen_url}`}
                alt={p.nombre}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 7,
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1px solid #d1fae5',
                }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 7,
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                📦
              </div>
            )}

            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14 }}>
                {p.nombre}
              </strong>

              <span style={styles.codigo}>
                {p.codigo}
              </span>

              {p.proximo_venc && (
                <span style={badgeVenc(p.proximo_venc)}>
                  Vence: {formatFecha(p.proximo_venc)}
                </span>
              )}

              {p.subcategoria && (
                <span style={styles.subBadge}>
                  {SUBCATEGORIAS[p.categoria]?.find(
                    s => s.value === p.subcategoria
                  )?.label || p.subcategoria}
                </span>
              )}

              {p.etiqueta && (
                <span style={styles.etiquetaBadge}>
                  {p.etiqueta}
                </span>
              )}
            </div>

            <div style={styles.itemDerecha}>
              <span
                style={{
                  ...styles.precio,
                  color: '#111827',
                }}
              >
                ${Number(p.precio).toLocaleString('es-AR')}
              </span>

              {p.es_servicio ? (
                <span style={styles.servicioTag}>
                  Servicio
                </span>
              ) : (
                <>
                  <span style={styles.stock(Number(p.stock))}>Stock: {p.stock}</span>

                  {p.stock_por_vencer > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        color: '#d97706',
                      }}
                    >
                      ⚠ {p.stock_por_vencer} por vencer
                    </span>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const styles = {
  servicioTag: {
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 4,
    background: '#f3f4f6',
    color: '#6b7280',
    fontStyle: 'italic',
  },

  subBadge: {
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 4,
    background: '#eff6ff',
    color: '#3b82f6',
    marginLeft: 6,
    display: 'inline-block',
  },

  etiquetaBadge: {
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 4,
    background: '#fef3c7',
    color: '#92400e',
    marginLeft: 6,
    display: 'inline-block',
    fontWeight: 600,
  },

  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    padding: '8px 12px',
    background: 'white',
  },

  icon: {
    fontSize: 18,
  },

  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 15,
  },

  spinner: {
    fontSize: 16,
  },

  error: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 4,
  },

  lista: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    listStyle: 'none',
    margin: '4px 0 0',
    padding: 0,
    maxHeight: 'calc(100vh - 260px)',
    overflowY: 'auto',
  },

  listaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0fdf4',
    transition: 'background 0.1s',
  },

  itemDerecha: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },

  codigo: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 8,
  },

  precio: {
    fontWeight: 700,
    color: '#16a34a',
    fontSize: 15,
  },

  stock: (s) => ({
    fontSize: 11,
    color: s === 0 ? '#dc2626' : s <= 5 ? '#d97706' : '#6b7280',
    fontWeight: s <= 5 ? 600 : 400,
  }),

  catChip: {
    padding: '3px 10px',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    fontSize: 11,
    color: '#374151',
  },

  catChipOn: {
    background: '#15803d',
    color: 'white',
    border: '1px solid #15803d',
    fontWeight: 600,
  },

  subChip: {
    padding: '3px 10px',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    fontSize: 10,
    color: '#6b7280',
  },

  subChipOn: {
    background: '#374151',
    color: 'white',
    border: '1px solid #374151',
    fontWeight: 600,
  },
}

function formatFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function diasHasta(fecha) {
  return Math.ceil(
    (new Date(fecha) - new Date()) /
    (1000 * 60 * 60 * 24)
  )
}

function badgeVenc(fecha) {
  const dias = diasHasta(fecha)

  const color =
    dias < 0
      ? '#dc2626'
      : dias <= 15
        ? '#d97706'
        : dias <= 30
          ? '#ca8a04'
          : '#16a34a'

  const bg =
    dias < 0
      ? '#fef2f2'
      : dias <= 15
        ? '#fff7ed'
        : dias <= 30
          ? '#fefce8'
          : '#f0fdf4'

  return {
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 4,
    background: bg,
    color,
    marginLeft: 6,
    display: 'inline-block',
  }
}