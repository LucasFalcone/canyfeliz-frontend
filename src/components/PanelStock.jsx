import { useState, useEffect } from 'react'
import { getStock, getLotes, agregarLote, getAlertas, darBajaLote, getFaltantes, actualizarStockMinimo } from '../api/api'

function diasHasta(f) {
  return Math.ceil((new Date(f) - new Date()) / 86400000)
}
function fmtFecha(f) {
  return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
  const [alertas, setAlertas] = useState([])
  const [lotes, setLotes] = useState({})
  const [expandido, setExpandido] = useState(null)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ cantidad: '', fecha_venc: '', numero_lote: '' })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalBaja, setModalBaja] = useState(null)
  const [lotesModal, setLotesModal] = useState([])
  const [bajando, setBajando] = useState(null)
  const [faltantes, setFaltantes] = useState([])
  const [modalMinimo, setModalMinimo] = useState(null)
  const [nuevoMinimo, setNuevoMinimo] = useState('')
  const [guardandoMin, setGuardandoMin] = useState(false)

  const ac = {
    primary: accent.btn || '#16a34a',
    dark: accent.badgeText || '#15803d',
    border: accent.border || '#d1fae5',
  }

  useEffect(() => {
    Promise.all([getStock(), getAlertas(30), getFaltantes()])
      .then(([p, a, f]) => { setProductos(p); setAlertas(a); setFaltantes(f) })
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
    if (!form.cantidad || !form.fecha_venc) return
    setGuardando(true)
    try {
      await agregarLote(modal.id, form)
      const data = await getLotes(modal.id)
      setLotes(prev => ({ ...prev, [modal.id]: data }))
      const stocks = await getStock()
      setProductos(stocks)
      setMsg(`Lote agregado a ${modal.nombre}`)
      setModal(null)
      setForm({ cantidad: '', fecha_venc: '', numero_lote: '' })
      setTimeout(() => setMsg(null), 3000)
    } catch { setMsg('Error al guardar') }
    finally { setGuardando(false) }
  }

  const abrirBajaLotes = async (producto) => {
    setModalBaja(producto)
    setLotesModal([])
    const data = await getLotes(producto.id)
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
  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo || '').includes(busqueda)
  )

  const alertasFiltradas = alertas.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (a.codigo || '').includes(busqueda)
  )

  // Función para guardar mínimo:
  const handleGuardarMinimo = async () => {
    if (!nuevoMinimo && nuevoMinimo !== '0') return
    setGuardandoMin(true)
    try {
      await actualizarStockMinimo(modalMinimo.id, nuevoMinimo)
      setMsg(`Stock mínimo actualizado para ${modalMinimo.nombre}`)
      setTimeout(() => setMsg(null), 3000)
      const [stocks, falt] = await Promise.all([getStock(), getFaltantes()])
      setProductos(stocks)
      setFaltantes(falt)
      setModalMinimo(null)
      setNuevoMinimo('')
    } catch { setMsg('Error al guardar') }
    finally { setGuardandoMin(false) }
  }

  return (
    <div style={{ ...s.pantalla, background: bodyColor }}>
      <header style={{ ...s.header, background: headerColor }}>
        <button style={s.hbtn} onClick={onVolver}>← POS</button>
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
            Alertas {alertas.length > 0 && `(${alertas.length})`}
          </button>
          <button
            style={{ ...s.tab, ...(tab === 'faltantes' ? s.tabActivo : {}) }}
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
            {productosFiltrados.map(p => {
              const dias = p.proximo_venc ? diasHasta(p.proximo_venc) : null
              const cv = dias !== null ? colorVenc(dias) : null
              return (
                <div key={p.id} style={s.card}>
                  <div style={s.cardHeader} onClick={() => toggleLotes(p.id)}>
                    <div style={{ flex: 1 }}>
                      <span style={s.pnombre}>{p.nombre}</span>
                      <span style={s.pcodigo}>{p.codigo}</span>
                    </div>
                    <div style={s.cardMeta}>
                      <span style={s.stockBadge(Number(p.stock))}>Stock: {p.stock}</span>
                      {cv && (
                        <span style={{ ...s.vencBadge, color: cv.color, background: cv.bg }}>
                          Próx. venc: {fmtFecha(p.proximo_venc)} ({cv.label})
                        </span>
                      )}
                      {p.stock_por_vencer > 0 && (
                        <span style={s.warnBadge}>⚠ {p.stock_por_vencer} por vencer</span>
                      )}
                      {p.stock_vencido > 0 && (
                        <span style={s.errBadge}>
                          🗑 {p.stock_vencido} vencidos — eliminar manualmente
                        </span>
                      )}
                      <button
                        style={{
                          ...s.btnAgregar,
                          background: ac.primary,
                        }}
                        onClick={e => { e.stopPropagation(); setModal(p) }}
                      >
                        + Lote
                      </button>
                      <button
                        style={s.btnBajaLote}
                        onClick={e => { e.stopPropagation(); setModalMinimo(p); setNuevoMinimo(p.stock_minimo || 0) }}
                      >
                        Stock mín.
                      </button>
                      <button
                        style={s.btnBajaLote}
                        onClick={e => { e.stopPropagation(); abrirBajaLotes(p) }}
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
                            const d = diasHasta(l.fecha_venc)
                            const cv = colorVenc(d)
                            return (
                              <tr key={l.id}>
                                <td style={s.td}>{l.numero_lote || '—'}</td>
                                <td style={s.td}>{fmtFecha(l.fecha_venc)}</td>
                                <td style={s.td}>{d < 0 ? 'Vencido' : `${d} días`}</td>
                                <td style={s.td}>{l.cantidad}</td>
                                <td style={s.td}>
                                  <span style={{ ...s.estadoBadge, color: cv.color, background: cv.bg }}>
                                    {l.estado === 'vencido' ? 'Vencido' :
                                      l.estado === 'por_vencer' ? 'Por vencer' : 'OK'}
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
          </>
        )}

        {/* TAB: ALERTAS */}
        {!cargando && tab === 'alertas' && (
          alertasFiltradas.length === 0
            ? <p style={s.msg}>{busqueda ? 'No se encontraron alertas.' : 'Sin alertas activas ✅'}</p>
            : alertasFiltradas.map(a => {
              const dias = a.proximo_venc ? diasHasta(a.proximo_venc) : null
              const cv = dias !== null ? colorVenc(dias) : null
              return (
                <div key={a.id} style={{ ...s.card, borderLeft: `3px solid ${cv?.color || '#e5e7eb'}` }}>
                  <div style={s.cardHeader}>
                    <div style={{ flex: 1 }}>
                      <span style={s.pnombre}>{a.nombre}</span>
                      <span style={s.pcodigo}>{a.codigo}</span>
                    </div>
                    <div style={s.cardMeta}>
                      {a.stock === 0 && <span style={s.errBadge}>Sin stock</span>}
                      {a.stock_vencido > 0 && (
                        <span style={s.errBadge}>🗑 {a.stock_vencido} vencidos</span>
                      )}
                      {a.stock_por_vencer > 0 && (
                        <span style={s.warnBadge}>⚠ {a.stock_por_vencer} por vencer</span>
                      )}
                      {cv && (
                        <span style={{ ...s.vencBadge, color: cv.color, background: cv.bg }}>
                          {fmtFecha(a.proximo_venc)}
                        </span>
                      )}
                      <button
                        style={s.btnAgregar}
                        onClick={() => setModal(a)}
                      >
                        + Lote
                      </button>

                      <button
                        style={s.btnBajaLote}
                        onClick={() => abrirBajaLotes(a)}
                      >
                        Baja lote
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
        )}

        {/* TAB: FALTANTES */}
        {!cargando && tab === 'faltantes' && (
          <>
            {faltantes.length === 0
              ? <p style={s.msg}>Sin faltantes ✅</p>
              : faltantes.filter(f =>
                f.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                (f.codigo || '').includes(busqueda)
              ).map(f => (
                <div key={f.id} style={{ ...s.card, borderLeft: '3px solid #dc2626' }}>
                  <div style={s.cardHeader}>
                    <div style={{ flex: 1 }}>
                      <span style={s.pnombre}>{f.nombre}</span>
                      <span style={s.pcodigo}>{f.codigo}</span>
                    </div>
                    <div style={s.cardMeta}>
                      <span style={s.stockBadge(Number(f.stock))}>
                        Stock: {f.stock}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 5,
                        background: '#fef2f2', color: '#dc2626', fontWeight: 600
                      }}>
                        Mínimo: {f.stock_minimo}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 5,
                        background: '#fff7ed', color: '#d97706', fontWeight: 600
                      }}>
                        Faltan: {f.unidades_faltantes}
                      </span>
                      <button
                        style={s.btnBajaLote}
                        onClick={() => { setModalMinimo(f); setNuevoMinimo(f.stock_minimo) }}
                      >
                        Editar mínimo
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }
          </>
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

            <label style={s.lbl}>Cantidad *</label>
            <input
              style={{
                ...s.inp,
                border: `1.5px solid ${ac.border}`,
              }} type="number" min="1"
              value={form.cantidad}
              onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
              placeholder="50"
            />

            <label style={s.lbl}>Fecha de vencimiento *</label>
            <input
              style={{
                ...s.inp,
                border: `1.5px solid ${ac.border}`,
              }} type="date"
              value={form.fecha_venc}
              onChange={e => setForm(f => ({ ...f, fecha_venc: e.target.value }))}
            />

            <label style={s.lbl}>Número de lote (opcional)</label>
            <input
              style={{
                ...s.inp,
                border: `1.5px solid ${ac.border}`,
              }} type="text"
              value={form.numero_lote}
              onChange={e => setForm(f => ({ ...f, numero_lote: e.target.value }))}
              placeholder="RC-2024-C"
            />

            <div style={s.modalBtns}>
              <button style={s.btnCancel} onClick={() => setModal(null)}>Cancelar</button>
              <button
                style={{
                  ...s.btnConfirm,
                  background: ac.primary,
                }} onClick={handleAgregarLote} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Agregar lote'}
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
              const dias = diasHasta(l.fecha_venc)
              const vencido = dias < 0
              const porVencer = dias >= 0 && dias <= 30
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, marginBottom: 8,
                  borderWidth: 1, borderStyle: 'solid',
                  borderColor: vencido ? '#fecaca' : porVencer ? '#fde68a' : '#d1fae5',
                  background: vencido ? '#fef2f2' : porVencer ? '#fefce8' : '#f9fafb',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {l.numero_lote || `Lote #${l.id}`}
                      </span>
                      {vencido && <span style={s.errBadge}>Vencido</span>}
                      {porVencer && !vencido && <span style={s.warnBadge}>Por vencer</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Vence: {fmtFecha(l.fecha_venc)} &nbsp;·&nbsp;
                      {vencido ? `Venció hace ${Math.abs(dias)}d` : `${dias} días`} &nbsp;·&nbsp;
                      <strong>{l.cantidad} unidades</strong>
                    </div>
                  </div>
                  {l.cantidad > 0 ? (
                    <button
                      style={{ ...s.btnAgregar, background: '#d97706' }}
                      onClick={() => handleDarBajaLote(l.id)}
                      disabled={bajando === l.id}
                    >
                      {bajando === l.id ? '...' : 'Dar de baja'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Ya dado de baja</span>
                  )}
                </div>
              )
            })}

            <div style={{ marginTop: 16 }}>
              <button style={s.btnCancel} onClick={() => setModalBaja(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modalMinimo && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <h3 style={s.modalTitulo}>Stock mínimo — {modalMinimo.nombre}</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
              Stock actual: <strong>{modalMinimo.stock}</strong> unidades.
              Cuando baje de este mínimo aparecerá en Faltantes.
            </p>
            <label style={s.lbl}>Unidades mínimas</label>
            <input
              style={s.inp}
              type="number"
              min="0"
              value={nuevoMinimo}
              onChange={e => setNuevoMinimo(e.target.value)}
              placeholder="0 = sin mínimo"
              autoFocus
            />
            <div style={s.modalBtns}>
              <button style={s.btnCancel} onClick={() => { setModalMinimo(null); setNuevoMinimo('') }}>
                Cancelar
              </button>
              <button style={s.btnConfirm} onClick={handleGuardarMinimo} disabled={guardandoMin}>
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
    display: 'flex', alignItems: 'center', gap: 12
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
  body: { maxWidth: 900, margin: '20px auto', padding: '0 16px' },
  searchInput: {
    width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 14,
    border: '1.5px solid #d1fae5', fontSize: 13, outline: 'none',
    background: 'white', display: 'block'
  },
  msg: { textAlign: 'center', color: '#6b7280', padding: 40 },
  card: {
    background: 'white', borderRadius: 10, marginBottom: 8,
    border: '0.5px solid #d1fae5', overflow: 'hidden'
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pnombre: { fontWeight: 600, fontSize: 14, color: '#111827' },
  pcodigo: { fontSize: 11, color: '#9ca3af', marginLeft: 8 },
  stockBadge: (v) => ({
    fontSize: 11, padding: '2px 7px', borderRadius: 5, fontWeight: 600,
    background: v === 0 ? '#fef2f2' : v <= 5 ? '#fff7ed' : '#f0fdf4',
    color: v === 0 ? '#dc2626' : v <= 5 ? '#d97706' : '#15803d',
  }),
  vencBadge: { fontSize: 11, padding: '2px 7px', borderRadius: 5 },
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
    fontSize: 11, padding: '3px 9px', borderRadius: 6,
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
  modalBtns: { display: 'flex', gap: 8, marginTop: 20 },
  btnCancel: {
    flex: 1, padding: 10, borderRadius: 7, border: '1px solid #e5e7eb',
    background: 'white', cursor: 'pointer', fontSize: 13
  },
  btnConfirm: {
    flex: 2, padding: 10, borderRadius: 7, border: 'none',
    background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700
  },
  btnBajaLote: {
    fontSize: 11, padding: '3px 9px', borderRadius: 6,
    background: '#fefce8', color: '#854d0e',
    border: '1px solid #fde68a', cursor: 'pointer', fontWeight: 600
  },
}