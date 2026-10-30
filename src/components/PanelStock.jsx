import { useState, useEffect, Fragment } from 'react'
import { getStock, getLotes, agregarLote, darBajaLote, editarLote, actualizarStockMinimo } from '../api/api'
import { CATEGORIAS, SUBCATEGORIAS, labelCategoria, tieneSubcategorias } from '../utils/categorias'

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}

// Si imagen_url ya es una URL completa (Supabase Storage, http/https),
// se usa tal cual. Si es una ruta relativa vieja (ej: "/uploads/xxx.jpg"),
// se arma con VITE_API_URL como antes.
function resolverImagenUrl(url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${url}`
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

  return {
    color: `rgb(${red}, ${green}, ${blue})`,
    background: `rgba(${red}, ${green}, ${blue}, 0.12)`,
  }
}

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
  const [catFiltro, setCatFiltro] = useState('todas')
  const [subFiltro, setSubFiltro] = useState('')
  const [etiquetaFiltro, setEtiquetaFiltro] = useState('')
  const [modalBaja, setModalBaja] = useState(null)
  const [lotesModal, setLotesModal] = useState([])
  const [bajando, setBajando] = useState(null)
  const [cantBaja, setCantBaja] = useState({})      // { [loteId]: cantidad a dar de baja }
  const [editFecha, setEditFecha] = useState({})    // { [loteId]: 'YYYY-MM-DD' } mientras se edita
  const [guardandoFecha, setGuardandoFecha] = useState(null)
  const [lotesAbiertos, setLotesAbiertos] = useState({}) // { [loteId]: true } lotes con unidades desplegadas
  const [confirmBaja, setConfirmBaja] = useState(null) // { lote, cant }
  const [modalMinimo, setModalMinimo] = useState(null)
  const [nuevoMinimo, setNuevoMinimo] = useState('')
  const [guardandoMin, setGuardandoMin] = useState(false)
  const [hoverBtn, setHoverBtn] = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const isMobile = useIsMobile()


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

  const CATEGORIAS_STOCK = CATEGORIAS.filter(
    c => !['consultorio', 'cirugias_y_especialidades'].includes(c.value)
  )

  const pasaFiltros = (p) =>
    (catFiltro === 'todas' || p.categoria === catFiltro) &&
    (!subFiltro || p.subcategoria === subFiltro) &&
    (!etiquetaFiltro || p.etiqueta === etiquetaFiltro)

  const etiquetasDisponibles = [...new Set(
    productos
      .filter(p => catFiltro === 'todas' || p.categoria === catFiltro)
      .map(p => p.etiqueta)
      .filter(Boolean)
  )]

  const chipFiltro = (activo, id) => ({
    flexShrink: 0,
    whiteSpace: 'nowrap',
    padding: '7px 16px',
    borderRadius: 20,
    border: `1px solid ${activo ? ac.primary : '#e5e7eb'}`,
    background: activo ? ac.primary : 'white',
    color: activo ? 'white' : '#374151',
    fontWeight: activo ? 600 : 400,
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
    ...btnHover(id),
    ...(activo ? { boxShadow: 'none' } : {}),
  })

  const alertasVencimiento = productos.filter(pasaFiltros).filter(p => {
    if (CATEGORIAS_SIN_ALERTAS.has(p.categoria)) return false

    const tieneVencido = Number(p.stock_vencido) > 0

    if (tieneVencido) return true

    if (!p.proximo_venc) return false

    const dias = diasHasta(p.proximo_venc)

    return dias <= 60
  })

  const faltantes = productos.filter(pasaFiltros).filter(p => {
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

  const refrescarLotes = async () => {
    const data = await getLotes(modalBaja.id)
    setLotesModal(data)
    setLotes(prev => ({ ...prev, [modalBaja.id]: data }))
    const stocks = await getStock()
    setProductos(stocks)
  }

  // Valida y abre el pop up de confirmación
  const pedirConfirmacionBaja = (lote) => {
    const cant = Number(cantBaja[lote.id] ?? 1)
    if (!cant || cant <= 0) return setMsg('Cantidad inválida')
    if (cant > Number(lote.cantidad)) return setMsg(`El lote solo tiene ${lote.cantidad} unidades`)
    setConfirmBaja({ lote, cant })
  }

  const handleDarBajaLote = async (lote, cant) => {
    setConfirmBaja(null)
    setBajando(lote.id)

    try {
      await darBajaLote(modalBaja.id, lote.id, 'manual', cant)
      setMsg(cant >= Number(lote.cantidad) ? 'Lote dado de baja correctamente' : `Baja de ${cant} unidad(es) realizada`)
      setCantBaja(prev => { const n = { ...prev }; delete n[lote.id]; return n })
      await refrescarLotes()
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Error al dar de baja')
    } finally {
      setBajando(null)
    }
  }

  // Cambia el vencimiento de un lote o de `cant` unidades de ese lote
  // (si cant < cantidad del lote, el servidor separa esas unidades en un lote nuevo)
  const guardarFechaLote = async (producto, lote, cant, key) => {
    setGuardandoFecha(key)
    try {
      const body = { fecha_venc: editFecha[key] || null }
      if (cant < Number(lote.cantidad)) body.cantidad = cant
      await editarLote(producto.id, lote.id, body)

      setEditFecha(prev => { const n = { ...prev }; delete n[key]; return n })
      setMsg('Vencimiento actualizado')

      const data = await getLotes(producto.id)
      setLotes(prev => ({ ...prev, [producto.id]: data }))
      const stocks = await getStock()
      setProductos(stocks)

      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Error al guardar la fecha')
    } finally {
      setGuardandoFecha(null)
    }
  }

  const abrirEdicionFecha = (key, fecha) =>
    setEditFecha(prev => ({ ...prev, [key]: fecha ? String(fecha).slice(0, 10) : '' }))

  const cerrarEdicionFecha = (key) =>
    setEditFecha(prev => { const n = { ...prev }; delete n[key]; return n })

  const filaEdicionFecha = (p, l, key, cant) => (
    <tr key={`edit-${key}`}>
      <td style={{ ...s.td, background: '#f9fafb' }} colSpan={5}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#374151' }}>
            {cant > 1 ? `Nuevo vencimiento para las ${cant} unidades:` : 'Nuevo vencimiento de esta unidad:'}
          </span>
          <input
            type="date"
            value={editFecha[key]}
            onChange={e => setEditFecha(prev => ({ ...prev, [key]: e.target.value }))}
            style={{ padding: '5px 8px', fontSize: 16, borderRadius: 6, border: `1px solid ${ac.border}`, background: 'white' }}
          />
          <button
            style={{ ...s.btnAgregar, background: ac.primary, ...btnHover(`gf-${key}`) }}
            onMouseEnter={() => setHoverBtn(`gf-${key}`)}
            onMouseLeave={() => setHoverBtn(null)}
            disabled={guardandoFecha === key}
            onClick={() => guardarFechaLote(p, l, cant, key)}
          >
            {guardandoFecha === key ? '...' : 'Guardar'}
          </button>
          <button
            style={{ ...s.btnCancel, flex: 'none', padding: '6px 12px', ...btnHover(`cf-${key}`) }}
            onMouseEnter={() => setHoverBtn(`cf-${key}`)}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={() => cerrarEdicionFecha(key)}
          >
            Cancelar
          </button>
        </div>
      </td>
    </tr>
  )

  // Filtrar productos por búsqueda
  const productosFiltrados = productos
    .filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo || '').includes(busqueda)
    )
    .filter(p =>
      !['consultorio', 'cirugias_y_especialidades'].includes(p.categoria)
    )
    .filter(pasaFiltros)

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
            Vencimientos {alertasVencimiento.length > 0 && `(${alertasVencimiento.length})`}
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

        <style>{`
.cf-scroll-x{display:flex;flex-wrap:nowrap;overflow-x:scroll;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:#9ca3af #e5e7eb;-webkit-overflow-scrolling:touch}
.cf-scroll-x::-webkit-scrollbar{height:8px}
.cf-scroll-x::-webkit-scrollbar-track{background:#e5e7eb;border-radius:8px}
.cf-scroll-x::-webkit-scrollbar-thumb{background:#9ca3af;border-radius:8px}
.cf-scroll-x::-webkit-scrollbar-thumb:hover{background:#6b7280}
`}</style>

        {/* Filtros: categoría, marca / etiqueta / proveedor */}
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 11 }}>
          {[{ value: 'todas', label: 'Todas' }, ...CATEGORIAS_STOCK].map(c => (
            <button
              key={c.value}
              style={chipFiltro(catFiltro === c.value, `fcat-${c.value}`)}
              onMouseEnter={() => setHoverBtn(`fcat-${c.value}`)}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={() => {
                setCatFiltro(c.value)
                setSubFiltro('')
                setEtiquetaFiltro('')
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {tieneSubcategorias(catFiltro) && catFiltro !== 'farmacia' && (
          <div className="cf-scroll-x" style={{ gap: 9, padding: '3px 2px 8px', marginBottom: 12 }}>
            <button
              style={{ ...chipFiltro(subFiltro === '', 'fsub-todas'), fontSize: 13 }}
              onMouseEnter={() => setHoverBtn('fsub-todas')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={() => setSubFiltro('')}
            >
              Todas las marcas
            </button>
            {SUBCATEGORIAS[catFiltro].map(sub => (
              <button
                key={sub.value}
                style={{ ...chipFiltro(subFiltro === sub.value, `fsub-${sub.value}`), fontSize: 13 }}
                onMouseEnter={() => setHoverBtn(`fsub-${sub.value}`)}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => { setSubFiltro(sub.value); setEtiquetaFiltro('') }}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {catFiltro === 'farmacia' && etiquetasDisponibles.length > 0 && (
          <div className="cf-scroll-x" style={{ gap: 9, padding: '3px 2px 8px', marginBottom: 6 }}>
            <button
              style={{ ...chipFiltro(etiquetaFiltro === '', 'fetq-todas'), fontSize: 13 }}
              onMouseEnter={() => setHoverBtn('fetq-todas')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={() => setEtiquetaFiltro('')}
            >
              Todas
            </button>
            {etiquetasDisponibles.map(e => (
              <button
                key={e}
                style={{ ...chipFiltro(etiquetaFiltro === e, `fetq-${e}`), fontSize: 13 }}
                onMouseEnter={() => setHoverBtn(`fetq-${e}`)}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setEtiquetaFiltro(e)}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {catFiltro === 'farmacia' && (SUBCATEGORIAS.farmacia || []).length > 0 && (
          <div className="cf-scroll-x" style={{ gap: 9, padding: '3px 2px 8px', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center', flexShrink: 0 }}>Proveedor:</span>
            <button
              style={{ ...chipFiltro(subFiltro === '', 'fprov-todos'), fontSize: 13 }}
              onMouseEnter={() => setHoverBtn('fprov-todos')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={() => setSubFiltro('')}
            >
              Todos
            </button>
            {SUBCATEGORIAS.farmacia.map(sub => (
              <button
                key={sub.value}
                style={{ ...chipFiltro(subFiltro === sub.value, `fprov-${sub.value}`), fontSize: 13 }}
                onMouseEnter={() => setHoverBtn(`fprov-${sub.value}`)}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setSubFiltro(sub.value)}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

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
                      {isMobile ? (
                        <div style={s.cardHeaderMobile}>
                          <div style={s.cardTop} onClick={() => toggleLotes(p.id)}>
                            {p.imagen_url ? (
                              <div
                                style={{
                                  width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                                  flexShrink: 0, border: `1px solid ${ac.border}`, cursor: 'zoom-in',
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
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                  }}
                                />
                              </div>
                            ) : (
                              <div style={{
                                width: 48, height: 48, borderRadius: 8, background: '#f3f4f6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 20, flexShrink: 0,
                              }}>
                                📦
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                <span style={s.pnombre}>{p.nombre}</span>
                                <span style={s.pcodigo}>{p.codigo}</span>
                              </div>
                            </div>

                            <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>
                              {expandido === p.id ? '▲' : '▼'}
                            </span>
                          </div>

                          <div style={s.cardBadges}>
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

                            <span style={s.stockBadge(Number(p.stock), p.stock_minimo)}>
                              Stock: {p.stock}
                            </span>
                          </div>

                          <div style={s.cardAcciones}>
                            <button
                              style={{
                                ...s.btnAgregar,
                                ...s.btnAccionMobile,
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
                                ...s.btnAccionMobile,
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
                                ...s.btnAccionMobile,
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
                          </div>
                        </div>
                      ) : (
                      <div style={s.cardHeader} onClick={() => toggleLotes(p.id)}>
                        {p.imagen_url ? (
                          <div
                            style={{
                              width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                              flexShrink: 0, border: `1px solid ${ac.border}`, cursor: 'zoom-in',
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
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          </div>
                        ) : (
                          <div style={{
                            width: 48, height: 48, borderRadius: 8, background: '#f3f4f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 20, flexShrink: 0,
                          }}>
                            📦
                          </div>
                        )}

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

                          <span style={s.stockBadge(Number(p.stock), p.stock_minimo)}>
                            Stock: {p.stock}
                          </span>

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

                          <span style={{ fontSize: 12, color: '#9ca3af' }}>
                            {expandido === p.id ? '▲' : '▼'}
                          </span>

                        </div>
                      </div>
                      )}


                      {expandido === p.id && (
                        <div style={s.lotesWrap}>
                          <table style={s.tabla}>
                            <thead>
                              <tr>
                                <th style={s.th}>Vencimiento</th>
                                <th style={s.th}>Días restantes</th>
                                <th style={s.th}>Cantidad</th>
                                <th style={s.th}>Estado</th>
                                <th style={s.th}></th>
                              </tr>
                            </thead>

                            <tbody>
                              {(lotes[p.id] || []).map(l => {
                                const sinVencimiento = SIN_VENCIMIENTO.has(p.categoria)
                                const d = !sinVencimiento && l.fecha_venc ? diasHasta(l.fecha_venc) : null
                                const cv = d !== null ? colorVenc(d) : null
                                const multi = !sinVencimiento && Number(l.cantidad) > 1
                                const abierto = !!lotesAbiertos[l.id]
                                const keyLote = `l-${l.id}`
                                const unidades = Math.min(Number(l.cantidad), 30)

                                return (
                                  <Fragment key={l.id}>
                                    <tr>
                                      <td style={s.td}>
                                        {!sinVencimiento ? fmtFecha(l.fecha_venc) : '—'}
                                      </td>

                                      <td style={s.td}>
                                        {d === null ? '—' : d < 0 ? 'Vencido' : `${d} días`}
                                      </td>

                                      <td style={s.td}>
                                        {multi && (
                                          <button
                                            title={abierto ? 'Ocultar unidades' : 'Ver cada unidad con su vencimiento'}
                                            style={{
                                              background: 'none', border: 'none', cursor: 'pointer',
                                              fontSize: 12, color: '#6b7280', padding: '0 6px 0 0',
                                              ...btnHover(`arrow-${l.id}`),
                                            }}
                                            onMouseEnter={() => setHoverBtn(`arrow-${l.id}`)}
                                            onMouseLeave={() => setHoverBtn(null)}
                                            onClick={() => setLotesAbiertos(prev => ({ ...prev, [l.id]: !prev[l.id] }))}
                                          >
                                            {abierto ? '▼' : '▶'}
                                          </button>
                                        )}
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

                                      <td style={{ ...s.td, textAlign: 'right' }}>
                                        {!sinVencimiento && (
                                          <button
                                            style={{
                                              ...s.btnBajaLote, fontSize: 13, padding: '4px 9px',
                                              ...btnHover(`edit-${l.id}`),
                                            }}
                                            onMouseEnter={() => setHoverBtn(`edit-${l.id}`)}
                                            onMouseLeave={() => setHoverBtn(null)}
                                            onClick={() => abrirEdicionFecha(keyLote, l.fecha_venc)}
                                          >
                                            ✏️ Editar venc.
                                          </button>
                                        )}
                                      </td>
                                    </tr>

                                    {editFecha[keyLote] !== undefined && filaEdicionFecha(p, l, keyLote, Number(l.cantidad))}

                                    {multi && abierto && (
                                      <>
                                        {Array.from({ length: unidades }, (_, i) => {
                                          const keyU = `u-${l.id}-${i}`
                                          return (
                                            <Fragment key={keyU}>
                                              <tr style={{ background: '#fafafa' }}>
                                                <td style={{ ...s.td, paddingLeft: 26, color: '#6b7280' }}>
                                                  ↳ Unidad {i + 1} · {fmtFecha(l.fecha_venc)}
                                                </td>
                                                <td style={s.td}>
                                                  {d === null ? '—' : d < 0 ? 'Vencido' : `${d} días`}
                                                </td>
                                                <td style={s.td}>1</td>
                                                <td style={s.td}></td>
                                                <td style={{ ...s.td, textAlign: 'right' }}>
                                                  <button
                                                    style={{
                                                      ...s.btnBajaLote, fontSize: 13, padding: '4px 9px',
                                                      ...btnHover(`editu-${keyU}`),
                                                    }}
                                                    onMouseEnter={() => setHoverBtn(`editu-${keyU}`)}
                                                    onMouseLeave={() => setHoverBtn(null)}
                                                    onClick={() => abrirEdicionFecha(keyU, l.fecha_venc)}
                                                  >
                                                    ✏️ Editar venc.
                                                  </button>
                                                </td>
                                              </tr>
                                              {editFecha[keyU] !== undefined && filaEdicionFecha(p, l, keyU, 1)}
                                            </Fragment>
                                          )
                                        })}
                                        {Number(l.cantidad) > unidades && (
                                          <tr>
                                            <td style={{ ...s.td, paddingLeft: 26, color: '#9ca3af', fontSize: 13 }} colSpan={5}>
                                              y {Number(l.cantidad) - unidades} unidades más con el mismo vencimiento
                                            </td>
                                          </tr>
                                        )}
                                      </>
                                    )}
                                  </Fragment>
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
                        {isMobile ? (
                        <div style={s.cardHeaderMobile}>
                          <div style={s.cardTop}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                <span style={s.pnombre}>{a.nombre}</span>
                                <span style={s.pcodigo}>{a.codigo}</span>
                              </div>
                            </div>
                          </div>

                          <div style={s.cardBadges}>
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
                          </div>

                          <div style={s.cardAcciones}>
                            <button
                              style={{
                                ...s.btnAgregar,
                                ...s.btnAccionMobile,
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
                                ...s.btnAccionMobile,
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
                        ) : (
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
                        )}
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
                      {isMobile ? (
                      <div style={s.cardHeaderMobile}>
                        <div style={s.cardTop}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                              <span style={s.pnombre}>{f.nombre}</span>
                              <span style={s.pcodigo}>{f.codigo}</span>
                            </div>
                          </div>
                        </div>

                        <div style={s.cardBadges}>
                          <span style={s.stockBadge(Number(f.stock), f.stock_minimo)}>
                            Stock: {f.stock}
                          </span>

                          <span
                            style={{
                              fontSize: 16,
                              padding: '2px 8px',
                              borderRadius: 5,
                              background: '#fef2f2',
                              color: '#dc2626',
                              fontWeight: 600
                            }}
                          >
                            Mínimo: {f.stock_minimo}
                          </span>
                        </div>

                        <div style={s.cardAcciones}>
                          <button
                            style={{
                              ...s.btnBajaLote,
                              ...s.btnAccionMobile,
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
                      ) : (
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

                          <span style={s.stockBadge(Number(f.stock), f.stock_minimo)}>
                            Stock: {f.stock}
                          </span>

                          <span
                            style={{
                              fontSize: 16,
                              padding: '2px 8px',
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
                              fontSize: 12,
                              padding: '2px 8px',
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
                      )}
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
                fontSize: 14,
                fontWeight: 600,
                padding: 0,
                marginBottom: 17,
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
                  opacity: guardando ? 0.7 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  ...btnHover('agregar-lote'),
                }}
                onMouseEnter={() => setHoverBtn('agregar-lote')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={handleAgregarLote}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Agregar lote'}
              </button>
            </div>
          </div>
        </div>
      )}
      {modalBaja && (
        <div style={s.overlay}>
          <div style={{ ...s.modalBox, width: 506 }}>
            <h3 style={{ ...s.modalTitulo, color: '#d97706' }}>
              🗑 Lotes — {modalBaja.nombre}
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 15 }}>
              Indicá cuántas unidades dar de baja de cada lote (el resto queda en stock) o cambiá su vencimiento.
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
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {l.numero_lote || `Lote #${l.id}`}
                      </span>

                      {vencido && <span style={s.errBadge}>Vencido</span>}
                      {porVencer && !vencido && <span style={s.warnBadge}>Por vencer</span>}
                    </div>

                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max={l.cantidad}
                          value={cantBaja[l.id] ?? 1}
                          onChange={e => setCantBaja(prev => ({ ...prev, [l.id]: e.target.value }))}
                          style={{ width: 56, padding: '6px 8px', fontSize: 16, borderRadius: 6, border: '1px solid #d1d5db', textAlign: 'center' }}
                        />
                        <button
                          style={{
                            ...s.btnAgregar,
                            background: hoverBtn === `baja-${l.id}` ? '#b45309' : '#d97706',
                            transform: hoverBtn === `baja-${l.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                            boxShadow: hoverBtn === `baja-${l.id}` ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={() => setHoverBtn(`baja-${l.id}`)}
                          onMouseLeave={() => setHoverBtn(null)}
                          onClick={() => pedirConfirmacionBaja(l)}
                          disabled={bajando === l.id}
                        >
                          {bajando === l.id ? '...' : 'Dar de baja'}
                        </button>
                      </div>
                      <button
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontSize: 12, color: '#6b7280', textDecoration: 'underline',
                        }}
                        onClick={() => setCantBaja(prev => ({ ...prev, [l.id]: l.cantidad }))}
                      >
                        Todo el lote ({l.cantidad})
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
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

      {confirmBaja && (
        <div style={{ ...s.overlay, zIndex: 1100 }} onClick={() => setConfirmBaja(null)}>
          <div style={{ ...s.modalBox, width: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 38, marginBottom: 6 }}>⚠️</div>
            <h3 style={{ ...s.modalTitulo, color: '#d97706', margin: '0 0 10px' }}>
              ¿Seguro que querés dar de baja?
            </h3>
            <p style={{ fontSize: 15, color: '#374151', margin: '0 0 4px' }}>
              {confirmBaja.cant >= Number(confirmBaja.lote.cantidad)
                ? <>Se da de baja <strong>todo el lote</strong> ({confirmBaja.lote.cantidad} unidades)</>
                : <>Se dan de baja <strong>{confirmBaja.cant}</strong> de {confirmBaja.lote.cantidad} unidades</>}
            </p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              de <strong>{modalBaja?.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={s.modalBtns}>
              <button
                style={{
                  ...s.btnCancel,
                  background: hoverBtn === 'conf-no' ? '#f9fafb' : 'white',
                  ...btnHover('conf-no'),
                }}
                onMouseEnter={() => setHoverBtn('conf-no')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setConfirmBaja(null)}
              >
                Cancelar
              </button>
              <button
                style={{
                  ...s.btnConfirm,
                  background: hoverBtn === 'conf-si' ? '#b45309' : '#d97706',
                  ...btnHover('conf-si'),
                }}
                onMouseEnter={() => setHoverBtn('conf-si')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => handleDarBajaLote(confirmBaja.lote, confirmBaja.cant)}
              >
                Sí, dar de baja
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

            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 15 }}>
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

const s = {
  pantalla: { minHeight: '100dvh', overflowX: 'hidden', background: '#f0fdf4', fontFamily: 'system-ui, sans-serif' },
  header: {
    background: '#15803d', color: 'white', padding: '13px 22px',
    display: 'flex', alignItems: 'center', gap: 13, position: 'sticky', top: 0, zIndex: 100,
    flexWrap: 'wrap',
  },
  hbtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14
  },
  htitulo: { fontSize: 18, fontWeight: 700, margin: 0 },
  tab: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: 'white', borderRadius: 7, padding: '4px 11px', cursor: 'pointer', fontSize: 15
  },
  tabActivo: { background: 'white', color: '#15803d', fontWeight: 700 },
  toast: {
    background: '#dcfce7', color: '#15803d', padding: '11px 22px', fontSize: 14,
    borderBottom: '1px solid #bbf7d0'
  },
  body: { maxWidth: 1300, margin: '22px auto', padding: '0 18px' },
  searchInput: {
    width: '100%', padding: '10px 13px', borderRadius: 9, marginBottom: 15,
    border: '1.5px solid #d1fae5', fontSize: 14, outline: 'none',
    background: 'white', display: 'block'
  },
  msg: { textAlign: 'center', color: '#6b7280', padding: 44 },
  card: {
    background: 'white',
    borderRadius: 11,
    marginBottom: 9,
    overflow: 'hidden'
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 11, padding: '14px 15px', cursor: 'pointer' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  cardHeaderMobile: { display: 'flex', flexDirection: 'column', gap: 9, padding: '14px 15px' },
  cardTop: { display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' },
  cardBadges: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  cardAcciones: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  btnAccionMobile: { flex: '1 1 auto', textAlign: 'center' },
  pnombre: { fontWeight: 600, fontSize: 19, color: '#111827' },
  pcodigo: { fontSize: 12, color: '#9ca3af', marginLeft: 9 },
  stockBadge: (v, minimo) => {
    const ratio = ratioStock(v, minimo)
    const { color, background } = colorGradienteStock(ratio)

    return {
      fontSize: 16, padding: '2px 8px', borderRadius: 5, fontWeight: 600,
      background, color,
    }
  },
  vencBadge: { fontSize: 14, padding: '2px 8px', borderRadius: 5 },
  warnBadge: {
    fontSize: 14, padding: '2px 8px', borderRadius: 5,
    background: '#fff7ed', color: '#d97706'
  },
  errBadge: {
    fontSize: 14, padding: '2px 8px', borderRadius: 5,
    background: '#fef2f2', color: '#dc2626'
  },
  estadoBadge: { fontSize: 13, padding: '2px 8px', borderRadius: 5 },
  btnAgregar: {
    fontSize: 16, padding: '6px 10px', borderRadius: 7,
    background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer'
  },
  lotesWrap: { borderTop: '1px solid #f0fdf4', padding: '0 15px 13px' },
  tabla: { width: '100%', borderCollapse: 'collapse', marginTop: 9 },
  th: {
    fontSize: 15, color: '#6b7280', textAlign: 'left', padding: '6px 9px',
    borderBottom: '1px solid #f0fdf4', fontWeight: 600
  },
  td: { fontSize: 15, padding: '6px 9px', borderBottom: '0.5px solid #f0fdf4', color: '#374151' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
  },
  modalBox: {
    background: 'white', borderRadius: 15, padding: 31, width: 374,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
  },
  modalTitulo: { fontSize: 18, fontWeight: 700, color: '#15803d', margin: '0 0 20px' },
  lbl: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', margin: '11px 0 4px' },
  inp: {
    width: '100%', padding: '9px 11px', borderRadius: 8, fontSize: 14,
    border: '1.5px solid #d1fae5', outline: 'none', color: '#111'
  },
  modalBtns: { display: 'flex', gap: 9, marginTop: 22, cursor: 'pointer' },
  btnCancel: {
    flex: 1, padding: 11, borderRadius: 8, border: '1px solid #e5e7eb',
    background: 'white', cursor: 'pointer', fontSize: 14
  },
  btnConfirm: {
    flex: 2, padding: 11, borderRadius: 8, border: 'none',
    background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700
  },
  btnBajaLote: {
    fontSize: 15, padding: '6px 10px', borderRadius: 7,
    background: '#fefce8', color: '#854d0e',
    border: '1px solid #fde68a', cursor: 'pointer', fontWeight: 600
  },
}