import { useState, useEffect } from 'react'
import { getStock, getLotes, agregarLote, darBajaLote, actualizarStockMinimo } from '../api/api'
import { CATEGORIAS, labelCategoria } from '../utils/categorias'


function diasHasta(f) {
  if (!f) return null

  const [y, m, d] = f.slice(0, 10).split('-').map(Number)

  const venc = new Date(y, m - 1, d)
  const hoy = new Date()

  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  return Math.ceil((venc - hoyLocal) / 86400000)
}

function fmtFecha(f) {
  if (!f) return '—'

  const [y, m, d] = f.slice(0, 10).split('-')

  return `${d}/${m}/${y}`
}

function colorVenc(dias) {
  if (dias < 0) return { color: '#dc2626', bg: '#fef2f2', label: 'Vencido' }
  if (dias <= 15) return { color: '#dc2626', bg: '#fef2f2', label: `${dias}d` }
  if (dias <= 30) return { color: '#d97706', bg: '#fff7ed', label: `${dias}d` }
  if (dias <= 60) return { color: '#ca8a04', bg: '#fefce8', label: `${dias}d` }
  return { color: '#16a34a', bg: '#f0fdf4', label: `${dias}d` }
}

export default function PanelStock({
  onVolver,
  headerColor = '#15803d',
  bodyColor = '#f0fdf4',
  accent = {},
}) {
  const [tab, setTab] = useState('stock')
  const [productos, setProductos] = useState([])
  const [lotes, setLotes] = useState({})
  const [expandido, setExpandido] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState([
    {
      cantidad: '',
      fecha_venc: '',
      numero_lote: ''
    }
  ])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalBaja, setModalBaja] = useState(null)
  const [lotesModal, setLotesModal] = useState([])
  const [bajando, setBajando] = useState(null)
  const [modalMinimo, setModalMinimo] = useState(null)
  const [nuevoMinimo, setNuevoMinimo] = useState('')
  const [guardandoMin, setGuardandoMin] = useState(false)
  const [hoverBtn, setHoverBtn] = useState(null)


  const stockProducto = (p) => p.stock_real ?? p.stock ?? 0
  const minimo = (p) => p.stock_minimo ?? 0
  const esFaltante = (p) => stockProducto(p) <= 0
  const esAlerta = (p) => stockProducto(p) > 0 && stockProducto(p) <= (p.stock_minimo ?? 0)

  const btnHover = (id) => {
    const isHover = hoverBtn === id

    return {
      transition: 'all 0.15s ease',
      transform: isHover ? 'translateY(-1px)' : 'translateY(0px)',
      boxShadow: isHover ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
    }
  }


  const ac = {
    primary: accent.btn ?? accent.primary,
    dark: accent.badgeText ?? '#15803d',
    border: accent.border ?? '#d1fae5',
  }

  const SIN_VENCIMIENTO = new Set([
    'accesorios',
    'sanitarios',
    'alimento_por_peso',
    'accesorios',
  ])

  const CATEGORIAS_SIN_ALERTAS = new Set([
    'consultorio',
    'cirugias_y_especialidades',

  ])

  const alertasVencimiento = productos.filter(p => {
    if (CATEGORIAS_SIN_ALERTAS.has(p.categoria)) return false
    if (!p.proximo_venc) return false

    const dias = diasHasta(p.proximo_venc)



    return dias <= 60
  })

  const faltantes = productos.filter(p => {
    if (CATEGORIAS_SIN_ALERTAS.has(p.categoria)) return false
    if (!p.stock_minimo || p.stock_minimo <= 0) return false
    return Number(stockProducto(p)) <= Number(minimo(p))
  })


  useEffect(() => {
    getStock()
      .then(setProductos)
      .finally(() => setCargando(false))
  }, [])

  const toggleLotes = async (id) => {
    if (expandido === id) { setExpandido(null); return }
    setExpandido(id)
    if (!lotes[id]) {
      const data = await getLotes(id)
      setLotes(prev => ({ ...prev, [id]: data }))
    }
  }

  const handleAgregarLote = async () => {
    const sinVencimiento = SIN_VENCIMIENTO.has(modal.categoria)
    const lotesValidos = form
      .filter(lote => lote.cantidad && lote.cantidad !== '')
      .map(lote => ({
        ...lote,
        cantidad: Number(lote.cantidad)
      }))

    if (lotesValidos.length === 0) return

    setGuardando(true)

    try {
      for (const lote of lotesValidos) {
        await agregarLote(modal.id, {
          ...lote,
          cantidad: Number(lote.cantidad),
          fecha_venc:
            SIN_VENCIMIENTO.has(modal.categoria)
              ? null
              : (lote.fecha_venc || null)
        })
      }

      const data = await getLotes(modal.id)
      setLotes(prev => ({
        ...prev,
        [modal.id]: data
      }))

      const stocks = await getStock()
      setProductos(stocks)
      console.log(JSON.stringify(stocks, null, 2))

      setMsg(
        `${lotesValidos.length} lote${lotesValidos.length > 1 ? 's' : ''} agregado${lotesValidos.length > 1 ? 's' : ''} a ${modal.nombre}`
      )

      setModal(null)

      setForm([
        {
          cantidad: '',
          fecha_venc: '',
          numero_lote: ''
        }
      ])

      setTimeout(() => setMsg(null), 3000)

    } catch {
      setMsg('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const agregarFilaLote = () => {
    setForm(prev => [
      ...prev,
      {
        cantidad: '',
        fecha_venc: '',
        numero_lote: ''
      }
    ])
  }

  const eliminarFilaLote = (i) => {
    setForm(prev => prev.filter((_, index) => index !== i))
  }

  const actualizarFila = (i, campo, valor) => {
    setForm(prev =>
      prev.map((l, index) =>
        index === i
          ? { ...l, [campo]: valor }
          : l
      )
    )
  }

  const abrirBajaLotes = async (producto) => {
    setModalBaja(producto)
    setLotesModal([])

    const data = await getLotes(producto.id)

    console.log(data)

    setLotesModal(data)
  }

  const handleDarBajaLote = async (loteId) => {
    setBajando(loteId)

    try {
      await darBajaLote(modalBaja.id, loteId, 'vencimiento')

      setMsg(`Lote dado de baja correctamente`)

      const data = await getLotes(modalBaja.id)

      setLotesModal(data)

      setLotes(prev => ({
        ...prev,
        [modalBaja.id]: data
      }))

      const stocks = await getStock()
      setProductos(stocks)

      setTimeout(() => setMsg(null), 3000)

    } catch {
      setMsg('Error al dar de baja')

    } finally {
      setBajando(null)
    }
  }

  // Filtrar productos por búsqueda
  const productosFiltrados = productos
    .filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo || '').includes(busqueda)
    )
    .filter(p =>
      !['consultorio', 'cirugias_y_especialidades'].includes(p.categoria)
    )

  const stockAgrupado = productosFiltrados.reduce((acc, p) => {
    const cat = p.categoria || 'otros'

    if (!acc[cat]) acc[cat] = []

    acc[cat].push(p)

    return acc
  }, {})


  const alertasAgrupadas = CATEGORIAS
    .filter(c =>
      !CATEGORIAS_SIN_ALERTAS.has(c.value)
    )
    .map(c => ({
      ...c,
      items: alertasVencimiento.filter(
        a => a.categoria === c.value
      )
    }))
    .filter(c => c.items.length > 0)

  const faltantesAgrupados = CATEGORIAS
    .filter(c => !CATEGORIAS_SIN_ALERTAS.has(c.value))
    .map(c => ({
      ...c,
      items: faltantes.filter(f => f.categoria === c.value)
    }))
    .filter(c => c.items.length > 0)

  // Función para guardar mínimo:
  const handleGuardarMinimo = async () => {
    if (!nuevoMinimo && nuevoMinimo !== '0') return

    setGuardandoMin(true)

    try {
      await actualizarStockMinimo(modalMinimo.id, nuevoMinimo)

      // 🔥 update inmediato UI (sin pisar con backend)
      setProductos(prev =>
        prev.map(p =>
          p.id === modalMinimo.id
            ? {
              ...p,
              stock_minimo: Number(nuevoMinimo)
            }
            : p
        )
      )

      setMsg(`Stock mínimo actualizado para ${modalMinimo.nombre}`)

      setTimeout(() => setMsg(null), 3000)



      setModalMinimo(null)
      setNuevoMinimo('')
    } catch {
      setMsg('Error al guardar')
    } finally {
      setGuardandoMin(false)
    }
  }

  return (
    <div style={{ ...s.pantalla, background: bodyColor }}>
      <header style={{
        ...s.header, background: headerColor,
      }}>
        <button
          style={{
            ...s.hbtn,
            ...btnHover('volver'),
          }}
          onMouseEnter={() => setHoverBtn('volver')}
          onMouseLeave={() => setHoverBtn(null)}
          onClick={onVolver}
        >
          ← POS
        </button>
        <h1 style={s.htitulo}>Gestión de stock</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            style={{
              ...s.tab,
              ...(tab === 'stock'
                ? {
                  ...s.tabActivo,
                  color: headerColor,
                }
                : {}),
            }} onClick={() => setTab('stock')}>
            Stock completo
          </button>
          <button
            style={{
              ...s.tab,
              ...(tab === 'alertas'
                ? {
                  ...s.tabActivo,
                  color: headerColor,
                }
                : {}),
            }} onClick={() => setTab('alertas')}>
            Alertas {alertasVencimiento.length > 0 && `(${alertasVencimiento.length})`}
          </button>
          <button
            style={{
              ...s.tab,
              ...(tab === 'faltantes'
                ? {
                  ...s.tabActivo,
                  color: headerColor,
                }
                : {}),
            }}
            onClick={() => setTab('faltantes')}
          >
            Faltantes {faltantes.length > 0 && `(${faltantes.length})`}
          </button>
        </div>
      </header>

      {msg && <div style={s.toast}>{msg}</div>}

      <div style={s.body}>

        {/* Buscador */}
        <input
          style={{
            ...s.searchInput,
            border: `1.5px solid ${ac.border}`,
          }}
          placeholder="Buscar producto por nombre o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          autoComplete="off"
        />

        {cargando && <p style={s.msg}>Cargando...</p>}

        {/* TAB: STOCK COMPLETO */}
        {!cargando && tab === 'stock' && (
          <>
            {productosFiltrados.length === 0 && (
              <p style={s.msg}>No se encontraron productos.</p>
            )}

            {Object.entries(
              productosFiltrados.reduce((acc, p) => {
                const cat = p.categoria || 'otros'

                if (!acc[cat]) acc[cat] = []

                acc[cat].push(p)

                return acc
              }, {})
            ).map(([categoria, productosCat]) => (
              <div key={categoria}>

                <div
                  style={{
                    ...s.grupoHeader,
                    color: ac.dark,
                    borderBottom: `2px solid ${ac.border}`,
                    marginBottom: 10,
                  }}
                >
                  {labelCategoria(categoria)}
                </div>

                {productosCat.map(p => {
                  const esBajoMinimo =
                    Number(p.stock) <= Number(p.stock_minimo || 0)
                  const sinVencimiento = SIN_VENCIMIENTO.has(p.categoria)

                  const dias =
                    !sinVencimiento && p.proximo_venc
                      ? diasHasta(p.proximo_venc)
                      : null

                  const cv = dias !== null ? colorVenc(dias) : null

                  return (
                    <div
                      key={p.id}
                      style={{
                        ...s.card,
                        border: `0.5px solid ${ac.border}`,
                        borderLeft: esBajoMinimo
                          ? '4px solid #dc2626'
                          : '4px solid transparent'
                      }}
                    >
                      <div style={s.cardHeader} onClick={() => toggleLotes(p.id)}>
                        <div style={{ flex: 1 }}>
                          <span style={s.pnombre}>{p.nombre}</span>
                          <span style={s.pcodigo}>{p.codigo}</span>
                        </div>

                        <div
                          style={{
                            ...s.cardMeta,
                            gap: 8
                          }}
                        >

                          <span style={s.stockBadge(Number(p.stock))}>
                            Stock: {p.stock}
                          </span>


                          {!sinVencimiento && cv && (
                            <span style={{
                              ...s.vencBadge,
                              color: cv.color,
                              background: cv.bg
                            }}>
                              Próx. venc: {fmtFecha(p.proximo_venc)} ({cv.label})
                            </span>
                          )}

                          {p.stock_por_vencer > 0 && (
                            <span style={s.warnBadge}>
                              ⚠ {p.stock_por_vencer} por vencer
                            </span>
                          )}

                          {p.stock_vencido > 0 && (
                            <span style={s.errBadge}>
                              🗑 {p.stock_vencido} vencidos — eliminar manualmente
                            </span>
                          )}

                          <button
                            style={{
                              ...s.btnAgregar,
                              background: hoverBtn === `agregar-${p.id}` ? ac.dark : ac.primary,
                              border: `1px solid ${ac.border}`,
                              transform: hoverBtn === `agregar-${p.id}` ? 'translateY(-1px)' : 'translateY(0)',
                              boxShadow: hoverBtn === `agregar-${p.id}` ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
                              transition: 'all .15s ease',
                            }}
                            onMouseEnter={() => setHoverBtn(`agregar-${p.id}`)}
                            onMouseLeave={() => setHoverBtn(null)}
                            onClick={e => {
                              e.stopPropagation()
                              setModal(p)
                              setForm([
                                {
                                  cantidad: '',
                                  fecha_venc: '',
                                  numero_lote: '',
                                },
                              ])
                            }}
                          >
                            + Lote
                          </button>

                          <button
                            style={{
                              ...s.btnBajaLote,
                              background: hoverBtn === `min-${p.id}` ? '#e5e7eb' : '#f3f4f6',
                              transition: 'all .15s ease'
                            }}
                            onMouseEnter={() => setHoverBtn(`min-${p.id}`)}
                            onMouseLeave={() => setHoverBtn(null)}
                            onClick={e => {
                              e.stopPropagation()
                              setModalMinimo(p)
                              setNuevoMinimo(p.stock_minimo || 0)
                            }}
                          >
                            {p.stock_minimo > 0
                              ? `Mín ≤ ${p.stock_minimo}`
                              : 'Stock mín.'}
                          </button>

                          <button
                            style={{
                              ...s.btnBajaLote,
                              background: hoverBtn === `baja-${p.id}` ? '#fef3c7' : '#fefce8',
                              borderColor: hoverBtn === `baja-${p.id}` ? '#f59e0b' : '#fde68a',
                              color: hoverBtn === `baja-${p.id}` ? '#78350f' : '#854d0e',
                              transform: hoverBtn === `baja-${p.id}` ? 'translateY(-1px)' : 'none',
                              transition: 'all .15s ease'
                            }}
                            onMouseEnter={() => setHoverBtn(`baja-${p.id}`)}
                            onMouseLeave={() => setHoverBtn(null)}
                            onClick={e => {
                              e.stopPropagation()
                              abrirBajaLotes(p)
                            }}
                          >
                            Baja lote
                          </button>

                          <span style={{ fontSize: 11, color: '#9ca3af' }}>
                            {expandido === p.id ? '▲' : '▼'}
                          </span>

                        </div>
                      </div>


                      {expandido === p.id && (
                        <div style={s.lotesWrap}>
                          <table style={s.tabla}>
                            <thead>
                              <tr>
                                <th style={s.th}>N° Lote</th>
                                <th style={s.th}>Vencimiento</th>
                                <th style={s.th}>Días restantes</th>
                                <th style={s.th}>Cantidad</th>
                                <th style={s.th}>Estado</th>
                              </tr>
                            </thead>

                            <tbody>
                              {(lotes[p.id] || []).map(l => {

                                const sinVencimiento = SIN_VENCIMIENTO.has(p.categoria)
                                const d = !sinVencimiento ? diasHasta(l.fecha_venc) : null
                                const cv = d !== null ? colorVenc(d) : null


                                return (
                                  <tr key={l.id}>

                                    <td style={s.td}>
                                      {l.numero_lote || '—'}
                                    </td>

                                    {!sinVencimiento ? (
                                      <>
                                        <td style={s.td}>
                                          {fmtFecha(l.fecha_venc)}
                                        </td>

                                        <td style={s.td}>
                                          {d < 0 ? 'Vencido' : `${d} días`}
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td style={s.td}>—</td>
                                        <td style={s.td}>—</td>
                                      </>
                                    )}

                                    <td style={s.td}>
                                      {l.cantidad}
                                    </td>

                                    <td style={s.td}>
                                      <span
                                        style={{
                                          ...s.estadoBadge,
                                          color: cv?.color || '#6b7280',
                                          background: cv?.bg || '#f3f4f6'
                                        }}
                                      >
                                        {l.estado === 'vencido'
                                          ? 'Vencido'
                                          : l.estado === 'por_vencer'
                                            ? 'Por vencer'
                                            : 'OK'}
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
                  )
                })}

              </div>
            ))}
          </>
        )}

        {/* TAB: ALERTAS */}
        {!cargando && tab === 'alertas' && (
          alertasVencimiento.length === 0 ? (
            <p style={s.msg}>
              {busqueda ? 'No se encontraron alertas.' : 'Sin alertas activas ✅'}
            </p>
          ) : (
            alertasAgrupadas.map(cat => {
              const items = cat.items

              return (
                <div key={cat.value} style={{ marginBottom: 18 }}>

                  {/* HEADER CATEGORÍA */}
                  <div style={{
                    ...s.grupoHeader,
                    color: ac.badgeText,
                    borderBottom: `2px solid ${ac.border}`,
                    marginBottom: 10
                  }}>
                    {cat.label}
                  </div>

                  {/* ITEMS */}
                  {items.map(a => {
                    const dias = a.proximo_venc ? diasHasta(a.proximo_venc) : null
                    const cv = dias !== null ? colorVenc(dias) : null



                    return (
                      <div
                        key={a.id}
                        style={{
                          ...s.card,
                          border: `0.5px solid ${ac.border}`,
                          borderLeft: `3px solid ${cv?.color || ac.border}`,
                        }}
                      >
                        <div style={s.cardHeader}>
                          <div style={{ flex: 1 }}>
                            <span style={s.pnombre}>{a.nombre}</span>
                            <span style={s.pcodigo}>{a.codigo}</span>
                          </div>

                          <div
                            style={{
                              ...s.cardMeta,
                              gap: 8
                            }}
                          >
                            {a.stock_vencido > 0 && (
                              <span style={s.errBadge}>🗑 {a.stock_vencido} vencidos</span>
                            )}

                            {a.stock_por_vencer > 0 && (
                              <span style={s.warnBadge}>⚠ {a.stock_por_vencer} por vencer</span>
                            )}

                            {cv && (
                              <span style={{
                                ...s.vencBadge,
                                color: cv.color,
                                background: cv.bg
                              }}>
                                {fmtFecha(a.proximo_venc)}
                              </span>
                            )}

                            <button
                              style={{
                                ...s.btnAgregar,
                                background: hoverBtn === `alerta-agregar-${a.id}` ? ac.dark : ac.primary,
                                border: `1px solid ${ac.border}`,
                                transform: hoverBtn === `alerta-agregar-${a.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                                boxShadow: hoverBtn === `alerta-agregar-${a.id}` ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all .15s ease',
                              }}
                              onMouseEnter={() => setHoverBtn(`alerta-agregar-${a.id}`)}
                              onMouseLeave={() => setHoverBtn(null)}
                              onClick={() => {
                                setModal(a)
                                setForm([{ cantidad: '', fecha_venc: '', numero_lote: '' }])
                              }}
                            >
                              + Lote
                            </button>

                            <button
                              style={{
                                ...s.btnBajaLote,
                                background: hoverBtn === `alerta-baja-${a.id}` ? '#fef3c7' : '#fefce8',
                                borderColor: hoverBtn === `alerta-baja-${a.id}` ? '#f59e0b' : '#fde68a',
                                color: hoverBtn === `alerta-baja-${a.id}` ? '#78350f' : '#854d0e',
                                transform: hoverBtn === `alerta-baja-${a.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                                transition: 'all .15s ease',
                              }}
                              onMouseEnter={() => setHoverBtn(`alerta-baja-${a.id}`)}
                              onMouseLeave={() => setHoverBtn(null)}
                              onClick={() => abrirBajaLotes(a)}
                            >
                              Baja lote
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )
        )}

        {/* TAB: FALTANTES */}
        {!cargando && tab === 'faltantes' && (
          faltantesAgrupados.length === 0 ? (
            <p style={s.msg}>Sin faltantes ✅</p>
          ) : (
            faltantesAgrupados.map(cat => {
              const items = cat.items.filter(
                f =>
                  f.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                  (f.codigo || '').includes(busqueda)
              )

              if (items.length === 0) return null

              return (
                <div key={cat.value} style={{ marginBottom: 18 }}>

                  <div
                    style={{
                      ...s.grupoHeader,
                      color: ac.badgeText,
                      borderBottom: `2px solid ${ac.border}`,
                      marginBottom: 10
                    }}
                  >
                    {cat.label}
                  </div>

                  {items.map(f => (
                    <div
                      key={f.id}
                      style={{
                        ...s.card,
                        border: `0.5px solid ${ac.border}`,
                        borderLeft: `3px solid ${ac.danger || '#dc2626'}`,
                      }}
                    >
                      <div style={s.cardHeader}>

                        <div style={{ flex: 1 }}>
                          <span style={s.pnombre}>{f.nombre}</span>
                          <span style={s.pcodigo}>{f.codigo}</span>
                        </div>

                        <div
                          style={{
                            ...s.cardMeta,
                            gap: 8
                          }}
                        >

                          <span style={s.stockBadge(Number(f.stock))}>
                            Stock: {f.stock}
                          </span>

                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 7px',
                              borderRadius: 5,
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontWeight: 600
                            }}
                          >
                            Mínimo: {f.stock_minimo}
                          </span>

                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 7px',
                              borderRadius: 5,
                              background: '#fff7ed',
                              color: '#d97706',
                              fontWeight: 600
                            }}
                          >

                          </span>

                          <button
                            style={{
                              ...s.btnBajaLote,
                              transform: hoverBtn === `editar-minimo-${f.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                              boxShadow: hoverBtn === `editar-minimo-${f.id}`
                                ? '0 4px 10px rgba(0,0,0,0.08)'
                                : 'none',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={() => setHoverBtn(`editar-minimo-${f.id}`)}
                            onMouseLeave={() => setHoverBtn(null)}
                            onClick={() => {
                              setModalMinimo(f)
                              setNuevoMinimo(f.stock_minimo)
                            }}
                          >
                            Editar mínimo
                          </button>

                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )
            })
          )
        )}
      </div>

      {/* Modal agregar lote */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <h3
              style={{
                ...s.modalTitulo,
                color: ac.dark,
              }}
            >Agregar lote — {modal.nombre}</h3>

            {form.map((lote, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12
                }}
              >
                <label style={s.lbl}>Cantidad *</label>
                <input
                  style={{
                    ...s.inp,
                    border: `1px solid ${ac.border}`,
                  }}
                  type="number"
                  min="1"
                  value={lote.cantidad}
                  onChange={e => {
                    const copia = [...form]
                    copia[i].cantidad = e.target.value
                    setForm(copia)
                  }}
                />

                {!SIN_VENCIMIENTO.has(modal.categoria) && (
                  <>
                    <label style={s.lbl}>Fecha de vencimiento *</label>
                    <input
                      style={{
                        ...s.inp,
                        border: `1px solid ${ac.border}`,
                      }}
                      type="date"
                      value={lote.fecha_venc}
                      onChange={e => {
                        const copia = [...form]
                        copia[i].fecha_venc = e.target.value
                        setForm(copia)
                      }}
                    />
                  </>
                )}



                {form.length > 1 && (
                  <button
                    style={{
                      marginTop: 8,
                      background: hoverBtn === `eliminar-lote-${i}` ? '#dc2626' : '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      transform: hoverBtn === `eliminar-lote-${i}` ? 'translateY(-1px)' : 'translateY(0px)',
                      boxShadow: hoverBtn === `eliminar-lote-${i}` ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
                    }}
                    onMouseEnter={() => setHoverBtn(`eliminar-lote-${i}`)}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => {
                      setForm(form.filter((_, idx) => idx !== i))
                    }}
                  >
                    Eliminar lote
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: ac.primary,
                fontSize: 13,
                fontWeight: 600,
                padding: 0,
                marginBottom: 15,
                cursor: 'pointer'
              }}
              onClick={() =>
                setForm([
                  ...form,
                  {
                    cantidad: '',
                    fecha_venc: '',
                    numero_lote: ''
                  }
                ])
              }
            >
              + Agregar otro lote
            </button>

            <div style={s.modalBtns}>
              <button
                style={{
                  ...s.btnCancel,
                  background: 'white',
                  border: `1px solid ${ac.border}`,
                  color: '#374151',
                  ...btnHover('cancelar-lote'),
                }}
                onMouseEnter={() => setHoverBtn('cancelar-lote')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                style={{
                  ...s.btnConfirm,
                  background: ac.primary,
                  border: 'none',
                  color: 'white',
                  ...btnHover('agregar-lote'),
                }}
                onMouseEnter={() => setHoverBtn('agregar-lote')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={handleAgregarLote}
              >
                Agregar lote
              </button>
            </div>
          </div>
        </div>
      )}
      {modalBaja && (
        <div style={s.overlay}>
          <div style={{ ...s.modalBox, width: 460 }}>
            <h3 style={{ ...s.modalTitulo, color: '#d97706' }}>
              🗑 Baja de lotes — {modalBaja.nombre}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
              Seleccioná el lote a dar de baja. El stock se descuenta automáticamente.
            </p>

            {lotesModal.length === 0 && <p style={s.msg}>No hay lotes registrados.</p>}

            {lotesModal.map(l => {
              const dias = l.fecha_venc ? diasHasta(l.fecha_venc) : null

              const vencido = dias !== null && dias < 0
              const porVencer = dias !== null && dias >= 0 && dias <= 30

              return (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: vencido
                      ? '#fecaca'
                      : porVencer
                        ? '#fde68a'
                        : '#d1fae5',
                    background: vencido
                      ? '#fef2f2'
                      : porVencer
                        ? '#fefce8'
                        : '#f9fafb',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {l.numero_lote || `Lote #${l.id}`}
                      </span>

                      {vencido && <span style={s.errBadge}>Vencido</span>}
                      {porVencer && !vencido && <span style={s.warnBadge}>Por vencer</span>}
                    </div>

                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {l.fecha_venc ? (
                        <>
                          Vence: {fmtFecha(l.fecha_venc)} &nbsp;·&nbsp;
                          {vencido
                            ? `Venció hace ${Math.abs(dias)}d`
                            : `${dias} días`}
                        </>
                      ) : (
                        'Sin vencimiento'
                      )}

                      &nbsp;·&nbsp;
                      <strong>{l.cantidad} unidades</strong>
                    </div>
                  </div>

                  {l.cantidad > 0 ? (
                    <button
                      style={{
                        ...s.btnAgregar,
                        background:
                          hoverBtn === `baja-${l.id}` ? '#b45309' : '#d97706',
                        transform:
                          hoverBtn === `baja-${l.id}`
                            ? 'translateY(-1px)'
                            : 'translateY(0px)',
                        boxShadow:
                          hoverBtn === `baja-${l.id}`
                            ? '0 4px 10px rgba(0,0,0,0.08)'
                            : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={() => setHoverBtn(`baja-${l.id}`)}
                      onMouseLeave={() => setHoverBtn(null)}
                      onClick={() => handleDarBajaLote(l.id)}
                      disabled={bajando === l.id}
                    >
                      {bajando === l.id ? '...' : 'Dar de baja'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      Ya dado de baja
                    </span>
                  )}
                </div>
              )
            })}

            <div style={{ marginTop: 16 }}>
              <button
                style={{
                  ...s.btnCancel,
                  background: hoverBtn === 'cerrar-baja' ? '#f9fafb' : 'white',
                  border: `1px solid ${ac.border}`,
                  transform: hoverBtn === 'cerrar-baja' ? 'translateY(-1px)' : 'translateY(0px)',
                  boxShadow: hoverBtn === 'cerrar-baja' ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={() => setHoverBtn('cerrar-baja')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setModalBaja(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMinimo && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <h3
              style={{
                ...s.modalTitulo,
                color: ac.dark,
              }}
            >
              Stock mínimo — {modalMinimo.nombre}
            </h3>

            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
              Stock actual: <strong>{modalMinimo.stock}</strong> unidades.
              Cuando baje de este mínimo aparecerá en Faltantes.
            </p>

            <label style={s.lbl}>Unidades mínimas</label>

            <input
              style={{
                ...s.inp,
                border: `1px solid ${ac.border}`,

              }}
              type="number"
              min="0"
              value={nuevoMinimo}
              onChange={e => setNuevoMinimo(e.target.value)}
              placeholder="0 = sin mínimo"
              autoFocus
            />

            <div style={s.modalBtns}>
              <button
                style={{
                  ...s.btnCancel,
                  background: hoverBtn === 'cancelar-minimo' ? '#f9fafb' : 'white',
                  border: `1px solid ${ac.border}`,
                  transform: hoverBtn === 'cancelar-minimo' ? 'translateY(-1px)' : 'translateY(0px)',
                  boxShadow: hoverBtn === 'cancelar-minimo'
                    ? '0 4px 10px rgba(0,0,0,0.08)'
                    : 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={() => setHoverBtn('cancelar-minimo')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => {
                  setModalMinimo(null)
                  setNuevoMinimo('')
                }}
              >
                Cancelar
              </button>

              <button
                style={{
                  ...s.btnConfirm,
                  background: ac.primary,
                  transform: hoverBtn === 'guardar-minimo' ? 'translateY(-1px)' : 'translateY(0px)',
                  boxShadow: hoverBtn === 'guardar-minimo'
                    ? '0 4px 10px rgba(0,0,0,0.08)'
                    : 'none',
                  transition: 'all 0.15s ease',
                  opacity: guardandoMin ? 0.7 : 1,
                  cursor: guardandoMin ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={() => setHoverBtn('guardar-minimo')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={handleGuardarMinimo}
                disabled={guardandoMin}
              >
                {guardandoMin ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pantalla: { minHeight: '100vh', background: '#f0fdf4', fontFamily: 'system-ui, sans-serif' },
  header: {
    background: '#15803d', color: 'white', padding: '12px 20px',
    display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100,
  },
  hbtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 12
  },
  htitulo: { fontSize: 16, fontWeight: 700, margin: 0 },
  tab: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: 'white', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12
  },
  tabActivo: { background: 'white', color: '#15803d', fontWeight: 700 },
  toast: {
    background: '#dcfce7', color: '#15803d', padding: '10px 20px', fontSize: 13,
    borderBottom: '1px solid #bbf7d0'
  },
  body: { maxWidth: 1100, margin: '20px auto', padding: '0 16px' },
  searchInput: {
    width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 14,
    border: '1.5px solid #d1fae5', fontSize: 13, outline: 'none',
    background: 'white', display: 'block'
  },
  msg: { textAlign: 'center', color: '#6b7280', padding: 40 },
  card: {
    background: 'white',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden'
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pnombre: { fontWeight: 600, fontSize: 15, color: '#111827' },
  pcodigo: { fontSize: 11, color: '#9ca3af', marginLeft: 8 },
  stockBadge: (v) => ({
    fontSize: 12, padding: '2px 7px', borderRadius: 5, fontWeight: 600,
    background: v === 0 ? '#fef2f2' : v <= 5 ? '#fff7ed' : '#f0fdf4',
    color: v === 0 ? '#dc2626' : v <= 5 ? '#d97706' : '#15803d',
  }),
  vencBadge: { fontSize: 12, padding: '2px 7px', borderRadius: 5 },
  warnBadge: {
    fontSize: 11, padding: '2px 7px', borderRadius: 5,
    background: '#fff7ed', color: '#d97706'
  },
  errBadge: {
    fontSize: 11, padding: '2px 7px', borderRadius: 5,
    background: '#fef2f2', color: '#dc2626'
  },
  estadoBadge: { fontSize: 11, padding: '2px 7px', borderRadius: 5 },
  btnAgregar: {
    fontSize: 12, padding: '3px 9px', borderRadius: 6,
    background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer'
  },
  lotesWrap: { borderTop: '1px solid #f0fdf4', padding: '0 14px 12px' },
  tabla: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th: {
    fontSize: 11, color: '#6b7280', textAlign: 'left', padding: '5px 8px',
    borderBottom: '1px solid #f0fdf4', fontWeight: 600
  },
  td: { fontSize: 12, padding: '5px 8px', borderBottom: '0.5px solid #f0fdf4', color: '#374151' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
  },
  modalBox: {
    background: 'white', borderRadius: 14, padding: 28, width: 340,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
  },
  modalTitulo: { fontSize: 16, fontWeight: 700, color: '#15803d', margin: '0 0 18px' },
  lbl: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', margin: '10px 0 4px' },
  inp: {
    width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 13,
    border: '1.5px solid #d1fae5', outline: 'none', color: '#111'
  },
  modalBtns: { display: 'flex', gap: 8, marginTop: 20, cursor: 'pointer' },
  btnCancel: {
    flex: 1, padding: 10, borderRadius: 7, border: '1px solid #e5e7eb',
    background: 'white', cursor: 'pointer', fontSize: 13
  },
  btnConfirm: {
    flex: 2, padding: 10, borderRadius: 7, border: 'none',
    background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700
  },
  btnBajaLote: {
    fontSize: 12, padding: '3px 9px', borderRadius: 6,
    background: '#fefce8', color: '#854d0e',
    border: '1px solid #fde68a', cursor: 'pointer', fontWeight: 600
  },
}