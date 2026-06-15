import { useState, useEffect, useRef } from 'react'
import { getReportes } from '../api/api'
import { useIsMobile } from '../hooks/useIsMobile'

// ── Helpers ─────────────────────────────────────────────────────
function fmtPeso(n) {
  return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })
}
function fmtFecha(f) {
  const [, mes, dia] = String(f).split('T')[0].split('-')
  return `${dia}/${mes}`
}

// Primer y último día del mes actual
function mesActual() {
  const hoy = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString().split('T')[0]
  const hasta = hoy.toISOString().split('T')[0]
  return { desde, hasta }
}

// ── Gráfico de barras (canvas puro) ─────────────────────────────
function BarChart({
  datos,
  alto = 160,
  color = '#16a34a',
  textColor = '#15803d',
}) {
  const ref = useRef()

  useEffect(() => {
    if (!datos?.length) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = alto
    canvas.height = H
    ctx.clearRect(0, 0, W, H)

    const max = Math.max(...datos.map(d => Number(d.total)), 1)
    const barW = Math.floor((W - 40) / datos.length) - 6
    const padL = 20

    datos.forEach((d, i) => {
      const x = padL + i * (barW + 6)
      const pct = Number(d.total) / max
      const barH = Math.max(4, Math.floor((H - 40) * pct))
      const y = H - 28 - barH

      // Barra
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0])
      ctx.fill()

      // Etiqueta fecha
      ctx.fillStyle = '#6b7280'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(fmtFecha(d.dia), x + barW / 2, H - 10)

      // Valor encima
      if (barH > 20) {
        ctx.fillStyle = textColor
        ctx.font = 'bold 9px system-ui'
        ctx.fillText(
          '$' + Math.round(Number(d.total) / 1000) + 'k',
          x + barW / 2, y - 4
        )
      }
    })
  }, [datos])

  return <canvas
    ref={ref}
    style={{
      width: '100%',
      height: alto,
      display: 'block',
    }}
    width={900}
  />
}

// ── Gráfico de torta (canvas puro) ──────────────────────────────
function PieChart({
  datos,
  size = 120,
  colors = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
}) {
  const ref = useRef()

  useEffect(() => {
    if (!datos?.length) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.height = size
    ctx.clearRect(0, 0, size, size)

    const total = datos.reduce((a, d) => a + Number(d.total), 0)
    if (!total) return

    let angle = -Math.PI / 2
    const cx = size / 2, cy = size / 2, r = size / 2 - 4

    datos.forEach((d, i) => {
      const slice = (Number(d.total) / total) * 2 * Math.PI
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, angle, angle + slice)
      ctx.closePath()
      ctx.fillStyle = colors[i % colors.length]
      ctx.fill()
      angle += slice
    })

    // Centro blanco
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI)
    ctx.fillStyle = 'white'
    ctx.fill()
  }, [datos, size])

  return <canvas ref={ref} width={size} height={size} style={{ borderRadius: '50%' }} />
}


export default function Reportes({
  onVolver,
  headerColor = '#15803d',
  bodyColor = '#f0fdf4',
  accent = {},
}) {
  const { desde: d0, hasta: h0 } = mesActual()
  const [desde, setDesde] = useState(d0)
  const [hasta, setHasta] = useState(h0)
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const isMobile = useIsMobile()

  const ac = {
    primary: accent.btn || '#16a34a',
    dark: accent.badgeText || '#15803d',
    border: accent.border || '#d1fae5',
  }

  const COLORS = [
    ac.primary,
    ac.dark,
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
  ]

  const cargar = (de, ha) => {
    setCargando(true)
    setError(null)
    getReportes(de, ha)
      .then(setData)
      .catch(err => setError(err?.response?.data?.error || 'Error al cargar reportes'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar(desde, hasta) }, [])

  const handleFiltrar = () => cargar(desde, hasta)

  return (
    <div style={{ ...s.pantalla, background: bodyColor }}>
      <header
        style={{
          ...s.header,
          background: headerColor,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}
      >
        <button style={s.hbtn} onClick={onVolver}>← POS</button>
        <h1 style={s.htitulo}>Reportes de ventas</h1>
      </header>

      <div style={s.body}>
        {/* Filtro de fechas */}
        <div
          style={{
            ...s.filtroRow,
            border: `0.5px solid ${ac.border}`,
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
          }}
        >
          <label style={s.flbl}>Desde</label>
          <input style={{
            ...s.finp,
            border: `1.5px solid ${ac.border}`,
            width: isMobile ? '100%' : undefined,
          }} type="date" value={desde}
            onChange={e => setDesde(e.target.value)} />
          <label style={s.flbl}>Hasta</label>
          <input style={{
            ...s.finp,
            border: `1.5px solid ${ac.border}`,
            width: isMobile ? '100%' : undefined,
          }} type="date" value={hasta}
            onChange={e => setHasta(e.target.value)} />
          <button
            style={{
              ...s.btnFiltrar,
              background: ac.primary,
              width: isMobile ? '100%' : undefined,
              marginLeft: 0,
            }} onClick={handleFiltrar}>Aplicar</button>
        </div>

        {cargando && <p style={s.msg}>Cargando reportes...</p>}
        {error && <p style={{ ...s.msg, color: '#dc2626' }}>{error}</p>}

        {!cargando && !error && data && (
          <>
            {/* ── Métricas ── */}
            <div
              style={{
                ...s.metricas,
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : 'repeat(3,1fr)',
              }}
            >
              <div
                style={{
                  ...s.mc,
                  border: `0.5px solid ${ac.border}`,
                }}
              >
                <p style={s.ml}>Ventas realizadas</p>
                <p style={s.mv}>{data.resumen.cantidad_ventas}</p>
              </div>
              <div
                style={{
                  ...s.mc,
                  border: `0.5px solid ${ac.border}`,
                }}
              >
                <p style={s.ml}>Total facturado</p>
                <p style={{ ...s.mv, color: ac.dark }}>
                  {fmtPeso(data.resumen.total_facturado)}
                </p>
              </div>
              <div
                style={{
                  ...s.mc,
                  border: `0.5px solid ${ac.border}`,
                }}
              >
                <p style={s.ml}>Ticket promedio</p>
                <p style={{ ...s.mv, color: '#3b82f6' }}>
                  {fmtPeso(data.resumen.ticket_promedio)}
                </p>
              </div>
            </div>

            {/* ── Gráfico ventas por día ── */}
            <div
              style={{
                ...s.card,
                border: `0.5px solid ${ac.border}`,
              }}
            >
              <h3 style={s.cardTitulo}>Ventas por día</h3>
              {data.porDia.length === 0
                ? <p style={s.msgCard}>Sin ventas en el período</p>
                : <BarChart
                  datos={data.porDia}
                  color={ac.primary}
                  textColor={ac.dark}
                />
              }
            </div>

            <div
              style={{
                ...s.dosColumnas,
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : '1fr 1fr',
              }}
            >
              {/* ── Medios de pago ── */}
              <div
                style={{
                  ...s.card,
                  border: `0.5px solid ${ac.border}`,
                }}
              >
                <h3 style={s.cardTitulo}>Medios de pago</h3>
                {data.medios.length === 0
                  ? <p style={s.msgCard}>Sin datos</p>
                  : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: 'center',
                        gap: 20,
                      }}
                    >
                      <PieChart
                        datos={data.medios}
                        colors={COLORS}
                      />
                      <div style={{ flex: 1 }}>
                        {data.medios.map((m, i) => (
                          <div key={m.medio_pago} style={s.legendRow}>
                            <span style={{ ...s.legendDot, background: COLORS[i] }} />
                            <span style={s.legendLabel}>{m.medio_pago}</span>
                            <span
                              style={{
                                ...s.legendVal,
                                color: ac.dark,
                              }}
                            >{fmtPeso(m.total)}</span>
                            <span style={s.legendCant}>({m.cantidad})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
              </div>

              {/* ── Top productos ── */}
              <div
                style={{
                  ...s.card,
                  border: `0.5px solid ${ac.border}`,
                }}
              >
                <h3 style={s.cardTitulo}>Top productos</h3>
                {data.productos.length === 0
                  ? <p style={s.msgCard}>Sin datos</p>
                  : data.productos.map((p, i) => {
                    const maxU = data.productos[0].unidades
                    const pct = (p.unidades / maxU) * 100
                    return (
                      <div key={p.nombre} style={s.topRow}>
                        <span
                          style={{
                            ...s.topNum,
                            background: ac.dark,
                          }}
                        >{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={s.topNombre}>{p.nombre}</span>
                            <span
                              style={{
                                ...s.topTotal,
                                color: ac.dark,
                              }}
                            >{fmtPeso(p.total)}</span>
                          </div>
                          <div style={s.barBg}>
                            <div
                              style={{
                                ...s.barFill,
                                width: pct + '%',
                                background: ac.primary,
                              }}
                            />
                          </div>
                          <span style={s.topUnidades}>{p.unidades} unidades</span>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          </>
        )}
      </div>
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
  body: { maxWidth: 960, margin: '20px auto', padding: '0 16px' },
  filtroRow: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
    background: 'white', padding: '12px 16px', borderRadius: 10,
    border: '0.5px solid #d1fae5'
  },
  flbl: { fontSize: 12, color: '#6b7280', fontWeight: 600 },
  finp: {
    padding: '6px 10px', borderRadius: 7, border: '1.5px solid #d1fae5',
    fontSize: 12, outline: 'none', color: '#111'
  },
  btnFiltrar: {
    padding: '7px 16px', borderRadius: 7, border: 'none', background: '#16a34a',
    color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginLeft: 4
  },
  msg: { textAlign: 'center', color: '#6b7280', padding: 40 },
  metricas: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 },
  mc: {
    background: 'white', borderRadius: 10, padding: '14px 16px',
    border: '0.5px solid #d1fae5'
  },
  ml: { fontSize: 12, color: '#6b7280', margin: '0 0 6px' },
  mv: { fontSize: 22, fontWeight: 800, margin: 0, color: '#111827' },
  card: {
    background: 'white', borderRadius: 10, padding: '16px',
    border: '0.5px solid #d1fae5', marginBottom: 14
  },
  cardTitulo: { fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 14px' },
  msgCard: { color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' },
  dosColumnas: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 12, color: '#374151', textTransform: 'capitalize' },
  legendVal: { fontSize: 12, fontWeight: 700, color: '#15803d' },
  legendCant: { fontSize: 11, color: '#9ca3af' },
  topRow: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  topNum: {
    fontSize: 13, fontWeight: 800, color: '#d1fae5', minWidth: 18,
    background: '#15803d', borderRadius: 4, textAlign: 'center',
    padding: '0 4px', lineHeight: '20px'
  },
  topNombre: { fontSize: 12, fontWeight: 600, color: '#374151' },
  topTotal: { fontSize: 12, fontWeight: 700, color: '#15803d' },
  topUnidades: { fontSize: 10, color: '#9ca3af' },
  barBg: { height: 5, background: '#f0fdf4', borderRadius: 3, margin: '3px 0' },
  barFill: { height: 5, background: '#16a34a', borderRadius: 3, transition: 'width 0.4s' },
}