import { useState, useRef, useEffect } from 'react'
import { buscarProductos } from '../api/api'
import { CATEGORIAS, SUBCATEGORIAS, tieneSubcategorias } from '../utils/categorias'
import { useIsMobile } from '../hooks/useIsMobile'

// Si imagen_url ya es una URL completa (Supabase Storage, http/https),
// se usa tal cual. Si es una ruta relativa vieja (ej: "/uploads/xxx.jpg"),
// se arma con VITE_API_URL como antes.
function resolverImagenUrl(url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${url}`
}


export default function BuscadorProductos({ onAgregar, accent = {}, modalClienteAbierto, refrescarTrigger }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [categoria, setCategoria] = useState('todas')
  const [subcategoria, setSubcategoria] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [imgPreview, setImgPreview] = useState(null)
  const [avisoVencido, setAvisoVencido] = useState(null)
  const [avisoSinStock, setAvisoSinStock] = useState(null)
  const [hoverBtn, setHoverBtn] = useState(null)

  const buttonHoverStyle = (id, base) => ({
    ...base,
    transform: hoverBtn === id ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hoverBtn === id ? '0 4px 10px rgba(0,0,0,0.12)' : 'none',
    transition: 'all 0.15s ease',
  })
  const [hoverItem, setHoverItem] = useState(null)
  const [hoverCat, setHoverCat] = useState(null)

  const isMobile = useIsMobile()
  const listaRef = useRef(null)
  const [listaMax, setListaMax] = useState(420)

  const baseBtn = {
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    outline: 'none',
    boxShadow: 'none',
    userSelect: 'none',
  }

  const hoverStyle = {
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  }

  const ac = {
    border: accent.border || '#d1fae5',
    borderFocus: accent.borderFocus || '#16a34a',
    badgeText: accent.badgeText || '#15803d',
  }


  const badgeBase = styles.badgeBase

  const inputRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Recalcula cuánto espacio queda hasta el borde inferior de la pantalla,
  // ya que ese valor cambia según si hay chips de subcategoría/etiqueta o no.
  useEffect(() => {
    const recalcular = () => {
      if (!listaRef.current) return
      const top = listaRef.current.getBoundingClientRect().top
      const disponible = window.innerHeight - top - 16
      setListaMax(Math.max(160, disponible))
    }

    recalcular()
    window.addEventListener('resize', recalcular)
    return () => window.removeEventListener('resize', recalcular)
  }, [categoria, subcategoria, etiqueta, error, resultados])

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

  }, [query, categoria, subcategoria, etiqueta, refrescarTrigger])

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
        if (!data[0].es_servicio && Number(data[0].stock) <= 0) {
          setAvisoSinStock(data[0])
        } else if (!data[0].es_servicio && Number(data[0].stock_vencido) > 0) {
          setAvisoVencido(data[0])
        } else {
          onAgregar(data[0])
          setQuery('')
        }

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
    if (!producto.es_servicio && Number(producto.stock) <= 0) {
      setAvisoSinStock(producto)
      return
    }
    if (!producto.es_servicio && Number(producto.stock_vencido) > 0) {
      setAvisoVencido(producto)
      return
    }
    onAgregar(producto)
    setQuery('')
    if (!isMobile) inputRef.current?.focus()
  }

  const confirmarVentaVencido = () => {
    if (!avisoVencido) return
    onAgregar(avisoVencido)
    setQuery('')
    setAvisoVencido(null)
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
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 7 }}>
        <button
          style={{
            ...styles.catChip,
            ...(hoverCat === 'todas'
              ? { background: '#f9fafb', transform: 'translateY(-1px)' }
              : {}),
            ...(categoria === 'todas'
              ? {
                ...styles.catChipOn,
                background: ac.borderFocus,
                border: `1px solid ${ac.borderFocus}`,
              }
              : {}),
          }}
          onMouseEnter={() => setHoverCat('todas')}
          onMouseLeave={() => setHoverCat(null)}
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
              ...(hoverCat === c.value
                ? { background: '#f9fafb', transform: 'translateY(-1px)' }
                : {}),
              ...(categoria === c.value
                ? {
                  ...styles.catChipOn,
                  background: ac.borderFocus,
                  border: `1px solid ${ac.borderFocus}`,
                }
                : {}),
            }}
            onMouseEnter={() => setHoverCat(c.value)}
            onMouseLeave={() => setHoverCat(null)}
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 9 }}>
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
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
      {!modalClienteAbierto && (
        <ul ref={listaRef} style={{ ...styles.lista, maxHeight: listaMax }}>
          {resultados.length === 0 && !cargando && (
            <li
              style={{
                padding: '13px 15px',
                color: '#9ca3af',
                fontSize: 14,
              }}
            >
              {error || 'Sin productos en esta categoría'}
            </li>
          )}

          {resultados.map(p => (
            <li
              key={p.id}
              style={{
                ...styles.listaItem,
                background: hoverItem === p.id ? '#f9fafb' : 'white',
              }}
              onMouseEnter={() => setHoverItem(p.id)}
              onMouseLeave={() => setHoverItem(null)}
              onClick={() => seleccionar(p)}
            >
              {/* Imagen */}
              {p.imagen_url ? (
                <div
                  style={{
                    width: 66, height: 66, borderRadius: 8, overflow: 'hidden',
                    flexShrink: 0, border: '1px solid #d1fae5', cursor: 'zoom-in', marginRight: 7,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()

                    setImgPreview(resolverImagenUrl(p.imagen_url))
                  }}
                >
                  <img
                    src={resolverImagenUrl(p.imagen_url)}
                    alt={p.nombre}
                    draggable={false}
                    style={{
                      objectFit: 'cover',
                      pointerEvents: 'auto',
                      width: '100%',
                      height: '100%',
                      borderRadius: 8,
                      display: 'block'
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 8, background: '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0, marginRight: 7,
                }}>
                  📦
                </div>
              )}

              {/* ===================== INFO ===================== */}
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 18, display: 'block', marginBottom: 8 }}>
                  {p.nombre}
                </strong>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span style={styles.codigo}>{p.codigo}</span>

                  {(
                    (p.subcategoria && p.categoria !== 'farmacia') ||
                    p.edad ||
                    p.etiqueta ||
                    (p.categoria === 'farmacia' && p.droga)
                  ) && (
                    <span style={styles.divisor}>|</span>
                  )}

                  {p.subcategoria &&
                    p.categoria !== 'farmacia' && (
                      <span
                        style={{
                          ...styles.badgeBase,
                          background: '#f3f4f6',
                          color: '#374151',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        {SUBCATEGORIAS[p.categoria]?.find(
                          (s) => s.value === p.subcategoria
                        )?.label || p.subcategoria}
                      </span>
                    )}

                  {p.edad && (
                    <span
                      style={{
                        ...styles.badgeBase,
                        background: '#f3f4f6',
                        color: '#4b5563',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      {p.edad}
                    </span>
                  )}

                  {p.etiqueta && (
                    <span
                      style={{
                        ...styles.badgeBase,
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        fontWeight: 500,
                      }}
                    >
                      {p.etiqueta}
                    </span>
                  )}

                  {p.categoria === 'farmacia' && p.droga && (
                    <span
                      style={{
                        ...styles.badgeBase,
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      {p.droga}
                    </span>
                  )}

                  {p.proximo_venc && (
                    <>
                      <span style={styles.divisor}>|</span>
                      <span style={badgeVenc(p.proximo_venc)}>
                        Vence: {formatFecha(p.proximo_venc)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* ===================== DERECHA ===================== */}
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
                    <span style={styles.stock(Number(p.stock), p.stock_minimo)}>
                      Stock: {p.stock}
                    </span>

                    {p.stock_por_vencer > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: '#d97706',
                        }}
                      >
                        ⚠ {p.stock_por_vencer} por vencer
                      </span>
                    )}

                    {p.stock_vencido > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: '#dc2626',
                          fontWeight: 600,
                        }}
                      >
                        ⛔ {p.stock_vencido} vencido{p.stock_vencido > 1 ? 's' : ''}
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal aviso de producto vencido */}
      {avisoVencido && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 14,
              padding: 26,
              width: 380,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px', fontSize: 17, color: '#dc2626' }}>
              Producto con stock vencido
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#374151' }}>
              <strong>{avisoVencido.nombre}</strong> tiene {avisoVencido.stock_vencido} unidad(es)
              vencida(s) en stock. ¿Confirmás igual la venta?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={buttonHoverStyle('cancelar-vencido', {
                  flex: 1,
                  padding: 11,
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                })}
                onMouseEnter={() => setHoverBtn('cancelar-vencido')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setAvisoVencido(null)}
              >
                Cancelar
              </button>
              <button
                style={buttonHoverStyle('vender-vencido', {
                  flex: 1,
                  padding: 11,
                  borderRadius: 8,
                  border: 'none',
                  background: '#dc2626',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                })}
                onMouseEnter={() => setHoverBtn('vender-vencido')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={confirmarVentaVencido}
              >
                Vender igual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal aviso de producto sin stock */}
      {avisoSinStock && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 14,
              padding: 26,
              width: 380,
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🚫</div>
            <h3 style={{ margin: '0 0 10px', fontSize: 17, color: '#dc2626' }}>
              Producto sin stock
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#374151' }}>
              <strong>{avisoSinStock.nombre}</strong> no tiene stock disponible.
              No se puede vender.
            </p>
            <button
              style={buttonHoverStyle('volver-sinstock', {
                width: '100%',
                padding: 11,
                borderRadius: 8,
                border: 'none',
                background: '#4b5563',
                color: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              })}
              onMouseEnter={() => setHoverBtn('volver-sinstock')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={() => setAvisoSinStock(null)}
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {/* Modal imagen ampliada */}
      {imgPreview && (
        <div
          onClick={() => setImgPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
          }}
        >
          <img
            src={imgPreview}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 12,
            }}
          />
        </div>
      )}

    </div>


  )
}



const styles = {
  servicioTag: {
    fontSize: 11,
    padding: '1px 7px',
    borderRadius: 4,
    background: '#f3f4f6',
    color: '#6b7280',
    fontStyle: 'italic',
  },

  badgeBase: {
    fontSize: 14,
    padding: '2px 9px',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    lineHeight: '20px',
    fontWeight: 500,
    border: '1px solid transparent',
    whiteSpace: 'nowrap',
  },

  imgWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid #d1fae5',
    position: 'relative',
  },

  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.2s ease',
    cursor: 'pointer',
  },

  imgWrapHover: {
    transform: 'scale(2)',
    zIndex: 50,
    position: 'relative',
  },

  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    border: '2px solid #e5e7eb',
    borderRadius: 11,
    padding: '9px 13px',
    background: 'white',
  },

  icon: {
    fontSize: 20,
  },

  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: 18,
  },

  spinner: {
    fontSize: 18,
  },

  error: {
    color: '#dc2626',
    fontSize: 14,
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
    borderRadius: 9,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    listStyle: 'none',
    margin: '4px 0 0',
    padding: 0,
    maxHeight: 'calc(100vh - 240px)',
    overflowY: 'auto',
  },

  listaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 15px',
    cursor: 'pointer',
    borderBottom: '1px solid #e5e7eb',
    transition: 'background 0.1s',
    outline: 'none',
    boxShadow: 'none',
  },

  itemDerecha: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },

  codigo: {
  fontSize: 14,
  color: '#6b7280',
  fontFamily: 'monospace',
  whiteSpace: 'nowrap',
},

  divisor: {
    color: '#d1d5db',
    fontSize: 15,
    lineHeight: 1,
  },

  precio: {
    fontWeight: 700,
    color: '#16a34a',
    fontSize: 18,
  },

  stock: (s, minimo) => {
    const ratio = ratioStock(s, minimo)

    return {
      fontSize: 14,
      color: colorGradienteStock(ratio),
      fontWeight: ratio <= 1 ? 600 : 400,
    }
  },

  catChip: {
    padding: '6px 13px',
    borderRadius: 20,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    fontSize: 13,
    color: '#374151',
    transition: 'all 0.15s ease',
    outline: 'none',
    boxShadow: 'none',
  },

  catChipOn: {
    background: '#15803d',
    color: 'white',
    border: '1px solid #15803d',
    fontWeight: 600,
  },

  subChip: {
    padding: '4px 11px',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    fontSize: 11,
    color: '#6b7280',
  },

  subChipOn: {
    background: '#374151',
    color: 'white',
    border: '1px solid #374151',
    fontWeight: 600,
  },

}

// Degradé continuo rojo -> naranja -> verde según qué tan lejos está el
// stock del mínimo configurado. ratio 0 = sin stock, 1 = justo en el mínimo,
// 2 (o más) = el doble del mínimo o más.
// Calcula qué tan "sano" está el stock respecto al mínimo, en una escala 0-2
// (0 = sin stock, 1 = justo en el mínimo, 2 = "sano"/verde).
// Para mínimos bajos, llegar al doble no tiene sentido (ej: mínimo 2 recién
// estaría sano con 4 unidades) — ahí usamos un colchón absoluto más chico.
function ratioStock(v, minimo) {
  const min = Number(minimo) || 0

  if (min <= 0) {
    return v === 0 ? 0 : Math.min(2, v / 5)
  }

  if (v <= min) return v / min

  const colchon = min <= 5 ? Math.max(1, Math.ceil(min / 2)) : min
  const verdeAt = min + colchon

  return 1 + (v - min) / (verdeAt - min)
}

function colorGradienteStock(ratio) {
  const rojo = [220, 38, 38]
  const naranja = [217, 119, 6]
  const verde = [22, 163, 74]

  const r = Math.max(0, Math.min(2, ratio))
  const mezclar = (a, b, t) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * t))

  const [red, green, blue] =
    r <= 1
      ? mezclar(rojo, naranja, r)
      : mezclar(naranja, verde, r - 1)

  return `rgb(${red}, ${green}, ${blue})`
}

function formatFecha(fecha) {
  if (!fecha) return '—'

  const [y, m, d] = fecha.slice(0, 10).split('-')

  return `${d}/${m}/${y}`
}

function diasHasta(fecha) {
  if (!fecha) return null

  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number)

  const venc = new Date(y, m - 1, d)
  const hoy = new Date()
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  return Math.ceil((venc - hoyLocal) / 86400000)
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
    fontSize: 13,
    padding: '1px 7px',
    borderRadius: 4,
    background: bg,
    color,
    marginLeft: 7,
    display: 'inline-block',
  }
}