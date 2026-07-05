import { useState, useEffect } from 'react'
import { obtenerVentas, emitirFactura } from '../api/api'
import { imprimirTicket as imprimirTicketFn } from '../utils/imprimirTicket'
import { emitirNotaCredito } from '../api/api'

const MEDIOS_LABEL = {
  efectivo: '💵',
  debito: '💳',
  credito: '💳',
  transferencia: '📱',
}

const TIPOS_CBTE = [
  { value: 6, label: 'Factura B — Consumidor final' },
  { value: 1, label: 'Factura A — Responsable inscripto' },
  { value: 11, label: 'Factura C — Monotributista' },
]

export default function HistorialVentas({
  onVolver,
  headerColor = '#15803d',
  bodyColor = '#f0fdf4',
  accent = {},
}) {
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [expandida, setExpandida] = useState(null)

  const [modalFactura, setModalFactura] = useState(null)
  const [facturando, setFacturando] = useState(null)
  const [toastFact, setToastFact] = useState(null)

  const [anioFiltro, setAnioFiltro] = useState('')
  const [mesFiltro, setMesFiltro] = useState('')
  const [diaFiltro, setDiaFiltro] = useState('')

  const [tipoImpresion, setTipoImpresion] = useState(null)
  const [emitiendo, setEmitiendo] = useState(null)

  const ac = {
    primary: accent.btn || '#16a34a',
    dark: accent.badgeText || '#15803d',
    border: accent.border || '#d1fae5',
  }

  useEffect(() => {
    obtenerVentas()
      .then(setVentas)
      .catch(() => setError('No se pudo cargar el historial'))
      .finally(() => setCargando(false))
  }, [])


  const aniosDisponibles = [...new Set(ventas.map(v =>
    new Date(v.fecha).getFullYear()
  ))].sort((a, b) => b - a)

  const mesesDisponibles = [...new Set(ventas
    .filter(v => !anioFiltro || new Date(v.fecha).getFullYear() === parseInt(anioFiltro))
    .map(v => {
      const f = new Date(v.fecha)
      return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`
    })
  )].sort()

  const diasDisponibles = mesFiltro
    ? [
      ...new Set(
        ventas
          .filter(v => {
            const f = new Date(v.fecha)

            const ym = `${f.getFullYear()}-${String(
              f.getMonth() + 1
            ).padStart(2, '0')}`

            return ym === mesFiltro
          })
          .map(v =>
            new Date(v.fecha)
              .toISOString()
              .split('T')[0]
          )
      ),
    ].sort()
    : []

  const ventasFiltradas = ventas.filter(v => {
    const f = new Date(v.fecha)
    const anio = f.getFullYear()
    const ym = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`
    const dia = f.toISOString().split('T')[0]

    if (anioFiltro && anio !== parseInt(anioFiltro)) return false
    if (diaFiltro) return dia === diaFiltro
    if (mesFiltro) return ym === mesFiltro
    return true
  })

  const totalDia = ventasFiltradas
    .filter(
      v =>
        new Date(v.fecha).toDateString() ===
        new Date().toDateString()
    )
    .reduce((a, v) => a + Number(v.total), 0)

  const mostrarToast = (msg, tipo = 'ok') => {
    setToastFact({ msg, tipo })

    setTimeout(() => {
      setToastFact(null)
    }, 4000)
  }

  const confirmarFactura = async tipoCbte => {
    const venta = modalFactura

    if (!venta) return

    setFacturando(venta.id)

    try {
      let factura = null

      if (tipoCbte !== null) {
        factura = await emitirFactura({
          venta_id: venta.id,
          tipo_cbte: tipoCbte,
          punto_venta: 2,
        })

        mostrarToast(
          `✅ Factura autorizada — CAE: ${factura.cae}`,
          'ok'
        )
      }

      const itemsVenta = (venta.items || []).map(i => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio_unit: i.precio_unit,
      }))

      imprimirTicketFn({
        venta: {
          ...venta,
          medio_pago: venta.medio_pago,
        },

        items: itemsVenta,

        factura,

        descuento:
          Number(venta.descuento) || 0,

        negocio: {
          nombre:
            import.meta.env
              .VITE_NEGOCIO_NOMBRE ||
            'CanyFeliz Veterinaria',

          direccion:
            import.meta.env
              .VITE_NEGOCIO_DIRECCION ||
            'Tu dirección acá',

          cuit:
            import.meta.env
              .VITE_NEGOCIO_CUIT ||
            '20-99999999-9',

          iva:
            import.meta.env
              .VITE_NEGOCIO_IVA ||
            'Responsable Inscripto',
        },
      })

      setModalFactura(null)
      setTipoImpresion(null)

    } catch (err) {
      mostrarToast(
        `❌ Error: ${err?.response?.data?.error ||
        err.message
        }`,
        'error'
      )
    } finally {
      setFacturando(null)
    }
  }


  const handleNotaCredito = async (venta) => {
    if (!window.confirm(`¿Emitir nota de crédito para la venta #${venta.id}?\nEsto anulará la factura.`))
      return

    const motivo = window.prompt('Motivo de la nota de crédito:', 'Anulación de factura')
    if (motivo === null) return

    setEmitiendo(venta.id)
    try {
      const nc = await emitirNotaCredito({
        factura_id: venta.factura_id,
        motivo,
      })
      mostrarToast(`✅ NC autorizada — CAE: ${nc.cae}`, 'ok')
    } catch (err) {
      mostrarToast(`❌ Error: ${err?.response?.data?.error || err.message}`, 'error')
    } finally {
      setEmitiendo(null)
    }
  }

  return (
    <div style={{ ...styles.pantalla, background: bodyColor }}>
      <header style={{
        ...styles.header, background: headerColor,
      }}>
        <button
          style={styles.btnVolver}
          onClick={onVolver}
        >
          ← Volver al POS
        </button>

        <h1 style={styles.titulo}>
          Historial de ventas
        </h1>
      </header>

      {toastFact && (
        <div
          style={{
            ...styles.toast,
            background:
              toastFact.tipo === 'ok'
                ? '#dcfce7'
                : '#fef2f2',

            color:
              toastFact.tipo === 'ok'
                ? '#15803d'
                : '#dc2626',
          }}
        >
          {toastFact.msg}
        </div>
      )}

      <div style={styles.contenido}>
        <div style={styles.metricas}>
          <div style={styles.metricaCard}>
            <p style={styles.metricaLabel}>
              Ventas hoy
            </p>

            <p style={styles.metricaValor}>
              {
                ventasFiltradas.filter(
                  v =>
                    new Date(
                      v.fecha
                    ).toDateString() ===
                    new Date().toDateString()
                ).length
              }
            </p>
          </div>

          <div style={styles.metricaCard}>
            <p style={styles.metricaLabel}>
              Total del día
            </p>

            <p
              style={{
                ...styles.metricaValor,
                color: ac.dark,
              }}
            >
              $
              {totalDia.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div style={styles.metricaCard}>
            <p style={styles.metricaLabel}>
              Total ventas
            </p>

            <p style={styles.metricaValor}>
              {ventasFiltradas.length}
            </p>
          </div>
        </div>

        {cargando && (
          <p style={styles.msg}>
            Cargando ventas...
          </p>
        )}

        {error && (
          <p
            style={{
              ...styles.msg,
              color: '#dc2626',
            }}
          >
            {error}
          </p>
        )}

        {!cargando &&
          !error &&
          ventasFiltradas.length === 0 && (
            <p style={styles.msg}>
              No hay ventas registradas.
            </p>
          )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Año:</span>
          <select
            style={{
              padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${ac.border}`,
              fontSize: 13, outline: 'none', background: 'white', color: '#374151',
              cursor: 'pointer',
            }}
            value={anioFiltro}
            onChange={e => {
              setAnioFiltro(e.target.value)
              setMesFiltro('')
              setDiaFiltro('')
            }}
          >
            <option value="">Todos</option>
            {aniosDisponibles.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: '#6b7280',
                fontWeight: 600,
              }}
            >
              Mes:
            </span>

            <button
              style={{
                ...styles.mesBtnStyle,
                ...(
                  (!mesFiltro && !diaFiltro)
                    ? {
                      ...styles.mesBtnOn,
                      background: ac.dark,
                      border: `1px solid ${ac.dark}`,
                    }
                    : {}
                ),
              }}
              onClick={() => {
                setMesFiltro('')
                setDiaFiltro('')
              }}
            >
              Todos
            </button>

            {mesesDisponibles.map(m => {
              const [anio, mes] = m.split('-')

              const label = new Date(
                anio,
                mes - 1
              ).toLocaleDateString('es-AR', {
                month: 'long',
                year: 'numeric',
              })

              return (
                <button
                  key={m}
                  style={{
                    ...styles.mesBtnStyle,
                    ...(mesFiltro === m
                      ? {
                        ...styles.mesBtnOn,
                        background: ac.dark,
                        border: `1px solid ${ac.dark}`,
                      }
                      : {}),
                  }}
                  onClick={() => {
                    setMesFiltro(m)
                    setDiaFiltro('')
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {mesFiltro &&
            diasDisponibles.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 5,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    fontWeight: 600,
                  }}
                >
                  Día:
                </span>

                <button
                  style={{
                    ...styles.diaBtnStyle,
                    ...(
                      !diaFiltro
                        ? styles.diaBtnOn
                        : {}
                    ),
                  }}
                  onClick={() =>
                    setDiaFiltro('')
                  }
                >
                  Todos
                </button>

                {diasDisponibles.map(d => {
                  const label = new Date(
                    d + 'T00:00:00'
                  ).toLocaleDateString(
                    'es-AR',
                    {
                      day: '2-digit',
                      weekday: 'short',
                    }
                  )

                  return (
                    <button
                      key={d}
                      style={{
                        ...styles.diaBtnStyle,
                        ...(diaFiltro === d
                          ? styles.diaBtnOn
                          : {}),
                      }}
                      onClick={() =>
                        setDiaFiltro(
                          diaFiltro === d
                            ? ''
                            : d
                        )
                      }
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
        </div>

        {ventasFiltradas.map(venta => (
          <div
            key={venta.id}
            style={styles.ventaCard}
          >
            <div
              style={styles.ventaHeader}
              onClick={() =>
                setExpandida(
                  expandida === venta.id
                    ? null
                    : venta.id
                )
              }
            >
              <div
                style={{
                  ...styles.ventaId,
                  color: ac.primary,
                }}
              >
                #{venta.id}
              </div>

              <div style={styles.ventaFecha}>
                {new Date(
                  venta.fecha
                ).toLocaleString('es-AR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </div>

              <div style={styles.ventaMedio}>
                {MEDIOS_LABEL[
                  venta.medio_pago
                ] || '💰'}{' '}
                {venta.medio_pago}
              </div>

              <div
                style={{
                  ...styles.ventaTotal,
                  color: ac.dark,
                }}
              >
                $
                {Number(
                  venta.total
                ).toLocaleString('es-AR', {
                  minimumFractionDigits: 2,
                })}
              </div>

              <button
                style={{
                  ...styles.btnFacturar,
                  border: `1px solid ${ac.border}`,
                  background: bodyColor,
                  color: ac.dark,
                }}
                onClick={e => {
                  e.stopPropagation()

                  setModalFactura(venta)
                  setTipoImpresion(null)
                }}
                disabled={
                  facturando === venta.id
                }
              >
                {facturando === venta.id
                  ? '...'
                  : '🖨️ Imprimir ticket'}
              </button>

              {venta.factura_cae && (
                <button
                  style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${ac.border}`, background: '#fef2f2',
                    color: '#dc2626', cursor: 'pointer', fontWeight: 600,
                    flexShrink: 0,
                  }}
                  onClick={e => { e.stopPropagation(); handleNotaCredito(venta) }}
                  disabled={emitiendo === venta.id}
                >
                  {emitiendo === venta.id ? '...' : '↩ Nota de crédito'}
                </button>
              )}

              <span style={styles.chevron}>
                {expandida === venta.id
                  ? '▲'
                  : '▼'}
              </span>
            </div>

            {expandida === venta.id && (
              <div style={styles.ventaDetalle}>
                <table style={styles.tabla}>
                  <thead>
                    <tr>
                      <th style={styles.th}>
                        Producto
                      </th>

                      <th style={styles.th}>
                        Cant.
                      </th>

                      <th style={styles.th}>
                        Precio unit.
                      </th>

                      <th style={styles.th}>
                        Subtotal
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {(venta.items || []).map(
                      (item, i) => (
                        <tr key={i}>
                          <td style={styles.td}>
                            {item.nombre}
                          </td>

                          <td style={styles.td}>
                            {item.cantidad}
                          </td>

                          <td style={styles.td}>
                            $
                            {Number(
                              item.precio_unit
                            ).toLocaleString(
                              'es-AR'
                            )}
                          </td>

                          <td style={styles.td}>
                            $
                            {(
                              item.cantidad *
                              item.precio_unit
                            ).toLocaleString(
                              'es-AR'
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
                <div
                  style={{
                    marginTop: 12,
                    borderTop: `1px solid ${ac.border}`,
                    paddingTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignItems: 'flex-end',
                    fontSize: 13,
                  }}
                >
                  {Number(venta.descuento) > 0 && (
                    <div
                      style={{
                        color: '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      Descuento: −$
                      {Number(venta.descuento).toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  )}

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: ac.dark,
                    }}
                  >
                    Total: $
                    {Number(venta.total).toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {modalFactura && (
          <div style={styles.overlayModal}>
            <div style={styles.modal}>
              <h3 style={{ marginBottom: 12 }}>
                Venta #{modalFactura.id} — ¿Qué querés hacer?
              </h3>

              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                Tipo de factura (opcional):
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <label style={{ fontSize: 13 }}>
                  <input
                    type="radio"
                    name="tipoCbte"
                    checked={tipoImpresion === null}
                    onChange={() => setTipoImpresion(null)}
                    style={{ marginRight: 6 }}
                  />
                  Solo ticket / preventa (sin factura)
                </label>

                {TIPOS_CBTE.map(t => (
                  <label key={t.value} style={{ fontSize: 13 }}>
                    <input
                      type="radio"
                      name="tipoCbte"
                      checked={tipoImpresion === t.value}
                      onChange={() => setTipoImpresion(t.value)}
                      style={{ marginRight: 6 }}
                    />
                    {t.label}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  style={styles.btnCancelar}
                  onClick={() => setModalFactura(null)}
                >
                  Cancelar
                </button>

                <button
                  style={{
                    ...styles.btnFacturar,
                    border: `1px solid ${ac.border}`,
                    background: bodyColor,
                    color: ac.dark,
                  }}
                  onClick={() => confirmarFactura(tipoImpresion)}
                  disabled={facturando === modalFactura.id}
                >
                  {facturando === modalFactura.id
                    ? 'Procesando...'
                    : '🖨️ Confirmar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  pantalla: {
    minHeight: '100vh',
    background: '#f0fdf4',
    fontFamily:
      'system-ui, sans-serif',
  },

  header: {
    background: '#15803d',
    color: 'white',
    padding: '14px 28px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },

  btnVolver: {
    background:
      'rgba(255,255,255,0.15)',
    border:
      '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    borderRadius: 7,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 13,
  },

  titulo: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },

  toast: {
    padding: '10px 24px',
    fontSize: 13,
    borderBottom:
      '1px solid rgba(0,0,0,0.06)',
  },

  contenido: {
    maxWidth: 900,
    margin: '24px auto',
    padding: '0 20px',
  },

  metricas: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(3,1fr)',
    gap: 12,
    marginBottom: 20,
  },

  metricaCard: {
    background: 'white',
    borderRadius: 10,
    padding: '14px 16px',
  },

  metricaLabel: {
    fontSize: 12,
    color: '#6b7280',
    margin: '0 0 6px',
  },

  metricaValor: {
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    color: '#111827',
  },

  msg: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 40,
  },

  ventaCard: {
    background: 'white',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },

  ventaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    flexWrap: 'wrap',
  },

  ventaId: {
    fontWeight: 700,
    color: '#16a34a',
    minWidth: 40,
    fontSize: 14,
  },

  ventaFecha: {
    flex: 1,
    minWidth: 120,
    fontSize: 13,
    color: '#374151',
  },

  ventaMedio: {
    fontSize: 13,
    color: '#6b7280',
    minWidth: 110,
  },

  ventaTotal: {
    fontWeight: 800,
    fontSize: 15,
    color: '#15803d',
    minWidth: 80,
    textAlign: 'right',
  },

  btnFacturar: {
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #d1fae5',
    background: '#f0fdf4',
    color: '#15803d',
    cursor: 'pointer',
    fontWeight: 600,
    flexShrink: 0,
  },

  chevron: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 4,
  },

  ventaDetalle: {
    borderTop:
      '1px solid #f0fdf4',
    padding: '0 16px 12px',
  },

  tabla: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 10,
  },

  th: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'left',
    padding: '6px 8px',
    borderBottom:
      '1px solid #f0fdf4',
    fontWeight: 600,
  },

  td: {
    fontSize: 13,
    padding: '6px 8px',
    borderBottom:
      '1px solid #f0fdf4',
  },

  mesBtnStyle: {
    padding: '4px 12px',
    borderRadius: 16,
    border: '1px solid #d1fae5',
    background: 'white',
    cursor: 'pointer',
    fontSize: 12,
    color: '#374151',
    textTransform: 'capitalize',
  },

  mesBtnOn: {
    background: '#15803d',
    color: 'white',
    border:
      '1px solid #15803d',
    fontWeight: 600,
  },

  diaBtnStyle: {
    padding: '3px 10px',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    fontSize: 11,
    color: '#374151',
  },

  diaBtnOn: {
    background: '#374151',
    color: 'white',
    border:
      '1px solid #374151',
    fontWeight: 600,
  },

  overlayModal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  modal: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    minWidth: 340,
    maxWidth: 440,
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },

  btnCancelar: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    cursor: 'pointer',
    fontSize: 13,
  },
}