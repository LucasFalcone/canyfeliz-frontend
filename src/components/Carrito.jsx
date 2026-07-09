import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import ItemCarrito from './ItemCarrito'
import { buscarClientes } from '../api/api'

export default function Carrito({
  items,
  total,
  onCambiarCantidad,
  onEliminar,
  onFinalizarVenta,
  clienteSeleccionado,
  onSeleccionarCliente,
  onQuitarCliente,
  onAbrirCliente,
  onCerrarCliente,
  descuento,
  onDescuentoManual,
  onLimpiarDescuento,
  cupon,
  onAplicarCupon,
  onQuitarCupon,
  accent = {},
}) {
  const [pctManual, setPctManual] = useState('')
  const [inputCupon, setInputCupon] = useState('')
  const [inputMonto, setInputMonto] = useState('')
  const [modalDescuento, setModalDescuento] = useState(false)
  const [modalCliente, setModalCliente] = useState(false)
  const [busqCliente, setBusqCliente] = useState('')
  const [resClientes, setResClientes] = useState([])
  const [cargandoCli, setCargandoCli] = useState(false)
  const timerCli = useRef(null)
  const [hoverChip, setHoverChip] = useState(null)
  const [hoverBtn, setHoverBtn] = useState(null)

  const buttonHoverStyle = (key, baseStyle) => ({
    ...baseStyle,
    ...(hoverBtn === key
      ? {
        transform: 'translateY(-1px)',
        boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
      }
      : {}),
  })

  const chipStyle = (active, key) => ({
    ...styles.catChip,
    ...(active ? styles.catChipOn : {}),
    ...(hoverChip === key && !active
      ? {
        background: '#f3f4f6',
        transform: 'translateY(-1px)',
      }
      : {}),
  })

  const ac = {
    primary: accent.primary || '#16a34a',
    light: accent.light || '#f0fdf4',
    text: accent.badgeText || '#15803d',

    title: accent.badgeText || '#15803d',
    border: accent.border || '#d1fae5',
    btn: accent.btn || '#16a34a',
    total: accent.badgeText || '#15803d',
  }



  const totalConDescuento = Math.max(0, total - descuento - (cupon?.monto || 0))
  const cantidadItems = items.reduce((acc, it) => acc + (it.cantidad || 0), 0)

  useEffect(() => {
    if (!modalCliente) return
    setCargandoCli(true)
    buscarClientes('').then(setResClientes).finally(() => setCargandoCli(false))
  }, [modalCliente])

  useEffect(() => {
    if (!modalCliente) return
    clearTimeout(timerCli.current)
    timerCli.current = setTimeout(async () => {
      setCargandoCli(true)
      const data = await buscarClientes(busqCliente)
      setResClientes(data)
      setCargandoCli(false)
    }, 300)
    return () => clearTimeout(timerCli.current)
  }, [busqCliente])



  return (
    <div style={styles.contenedor}>
      <h2
        style={{
          ...styles.titulo,
          color: ac.title,
        }}
      >
        🛒 Carrito
      </h2>

      {items.length === 0 ? (
        <div style={styles.vacio}>
          <span style={{ fontSize: 40 }}>🐾</span>
          <p>El carrito está vacío</p>
        </div>
      ) : (
        <>
          <div style={styles.lista}>
            {items.map(item => (
              <ItemCarrito
                key={item.id}
                item={item}
                onCambiarCantidad={onCambiarCantidad}
                onEliminar={onEliminar}
                accent={accent}
              />
            ))}
          </div>

          {/* Subtotal */}
          <div style={styles.subtotalRow}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Subtotal</span>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Sección descuentos - resumen compacto + botón para abrir modal */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 6
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                🏷️ Descuentos y cupón
              </span>
              <button
                style={buttonHoverStyle('resumen-desc', {
                  fontSize: 11, padding: '3px 10px', borderRadius: 6,
                  border: `1px solid ${ac.border}`, background: 'white',
                  cursor: 'pointer', color: ac.text, fontWeight: 600
                })}
                onMouseEnter={() => setHoverBtn('resumen-desc')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setModalDescuento(true)}
              >
                {descuento > 0 || cupon?.aplicado ? '✎ Editar' : '+ Agregar'}
              </button>
            </div>

            {(descuento > 0 || cupon?.aplicado) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {descuento > 0 && (
                  <div style={styles.descuentoAplicado}>
                    <span style={{ fontSize: 12, color: '#15803d' }}>
                      ✅ Descuento manual
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                      − ${descuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {cupon?.aplicado && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#dcfce7', borderRadius: 6, padding: '6px 10px',
                  }}>
                    <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                      🎟️ {cupon.codigo} — −${cupon.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                Sin descuentos aplicados
              </div>
            )}
          </div>

          {/* Modal descuento manual / cupón */}
          {modalDescuento && createPortal(
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2000
            }}>
              <div style={{
                background: 'white', borderRadius: 14, padding: 20, width: 380,
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 12
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: ac.primary, margin: 0 }}>
                    Descuentos y cupón
                  </h3>
                  <button
                    style={buttonHoverStyle('cerrar-modal-desc', {
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 18, color: '#6b7280'
                    })}
                    onMouseEnter={() => setHoverBtn('cerrar-modal-desc')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => setModalDescuento(false)}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, textAlign: 'center' }}>
                  {/* Descuento manual por % */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                    % Descuento manual
                  </div>
                  <div style={{ ...styles.descuentoManualRow, justifyContent: 'center' }}>
                    <input
                      style={styles.inputPct}
                      type="number"
                      min="0"
                      max="100"
                      value={pctManual}
                      onChange={e => setPctManual(e.target.value)}
                      placeholder="% desc."
                    />
                    <button
                      style={buttonHoverStyle('pct', styles.btnAplicarManual)}
                      onMouseEnter={() => setHoverBtn('pct')}
                      onMouseLeave={() => setHoverBtn(null)}
                      onClick={() => onDescuentoManual(pctManual, total)}
                      disabled={!pctManual}
                    >
                      Aplicar %
                    </button>
                    {descuento > 0 && (
                      <button
                        style={buttonHoverStyle('clear-desc', styles.btnLimpiar)}
                        onMouseEnter={() => setHoverBtn('clear-desc')}
                        onMouseLeave={() => setHoverBtn(null)}
                        onClick={() => {
                          onLimpiarDescuento()
                          setPctManual('')
                        }}
                      >
                        ✕ Quitar
                      </button>
                    )}
                  </div>

                  {/* Cupón */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 16, marginBottom: 7 }}>
                    🎟️ Cupón
                  </div>

                  {cupon?.aplicado ? (
                    <div style={{
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                      background: '#dcfce7', borderRadius: 6, padding: '6px 10px',
                    }}>
                      <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                        ✅ {cupon.codigo} — −${cupon.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        style={buttonHoverStyle('quitar-cupon', {
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#dc2626', fontSize: 12
                        })}
                        onMouseEnter={() => setHoverBtn('quitar-cupon')}
                        onMouseLeave={() => setHoverBtn(null)}
                        onClick={onQuitarCupon}
                      >
                        ✕ Quitar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <input
                        style={styles.inputPct}
                        type="number"
                        placeholder="$ monto"
                        value={inputMonto}
                        onChange={e => setInputMonto(e.target.value)}
                      />
                      <button
                        style={buttonHoverStyle('cupon', {
                          padding: '5px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#16a34a',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 600,
                        })}
                        onMouseEnter={() => setHoverBtn('cupon')}
                        onMouseLeave={() => setHoverBtn(null)}
                        onClick={() => {
                          const ok = onAplicarCupon('MANUAL', inputMonto)
                          if (ok) setInputMonto('')
                        }}
                        disabled={!inputMonto}
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </div>

                <button
                  style={buttonHoverStyle('listo-desc', {
                    marginTop: 14, padding: '9px', borderRadius: 7,
                    border: 'none', background: ac.btn, color: 'white',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600
                  })}
                  onMouseEnter={() => setHoverBtn('listo-desc')}
                  onMouseLeave={() => setHoverBtn(null)}
                  onClick={() => setModalDescuento(false)}
                >
                  Listo
                </button>
              </div>
            </div>,
            document.body
          )}

          {/* Cliente */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 6
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                👤 Cliente
              </span>
              {!clienteSeleccionado && (
                <button
                  style={buttonHoverStyle('seleccionar-cliente', {
                    fontSize: 11, padding: '3px 10px', borderRadius: 6,
                    border: `1px solid ${ac.border}`, background: 'white',
                    cursor: 'pointer', color: ac.text, fontWeight: 600
                  })}
                  onMouseEnter={() => setHoverBtn('seleccionar-cliente')}
                  onMouseLeave={() => setHoverBtn(null)}
                  onClick={() => {
                    setModalCliente(true)
                    setBusqCliente('')
                    onAbrirCliente?.()
                  }}
                >
                  + Seleccionar
                </button>
              )}
            </div>

            {clienteSeleccionado ? (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: ac.light,
                border: `1px solid ${ac.border}`, borderRadius: 7,
                padding: '7px 10px'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {clienteSeleccionado.razon_social}
                  </div>
                  {clienteSeleccionado.nro_doc && (
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {clienteSeleccionado.tipo_doc?.toUpperCase()}: {clienteSeleccionado.nro_doc}
                    </div>
                  )}
                </div>
                <button
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', fontSize: 14
                  }}
                  onClick={onQuitarCliente}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                Sin cliente asignado
              </div>
            )}
          </div>

          {/* Modal lista de clientes */}
          {modalCliente && createPortal(
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2000
            }}>
              <div style={{
                background: 'white', borderRadius: 14, padding: 20, width: 380,
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
              }}>

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 12
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: ac.primary, margin: 0 }}>
                    Seleccionar cliente
                  </h3>
                  <button
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 18, color: '#6b7280'
                    }}
                    onClick={() => {
                      setModalCliente(false)
                      onCerrarCliente?.()
                    }}
                  >
                    ✕
                  </button>
                </div>

                <input
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 7, fontSize: 13,
                    border: `1.5px solid ${ac.border}`, outline: 'none',
                    marginBottom: 10
                  }}
                  placeholder="Buscar..."
                  value={busqCliente}
                  onChange={e => setBusqCliente(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />

                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {cargandoCli && (
                    <p style={{ textAlign: 'center', color: '#6b7280', padding: 20, fontSize: 13 }}>
                      Cargando...
                    </p>
                  )}
                  {!cargandoCli && resClientes.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: 20, fontSize: 13 }}>
                      No se encontraron clientes
                    </p>
                  )}
                  {resClientes.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        marginBottom: 4, border: `1px solid ${ac.border}`,
                        background: 'white', transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = ac.light}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      onClick={() => {
                        onSeleccionarCliente(c)
                        setModalCliente(false)
                        onCerrarCliente?.()
                        setBusqCliente('')
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
                        {c.razon_social}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        {c.nro_doc && (
                          <span style={{ fontSize: 11, color: '#6b7280' }}>
                            {c.tipo_doc?.toUpperCase()}: {c.nro_doc}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: ac.text }}>
                          {c.tipo_iva?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  style={buttonHoverStyle('cancelar-cliente', {
                    marginTop: 12, padding: '9px', borderRadius: 7,
                    border: '1px solid #e5e7eb', background: 'white',
                    cursor: 'pointer', fontSize: 13
                  })}
                  onMouseEnter={() => setHoverBtn('cancelar-cliente')}
                  onMouseLeave={() => setHoverBtn(null)}
                  onClick={() => {
                    setModalCliente(false)
                    onCerrarCliente?.()
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>,
            document.body
          )}

          {/* Total final */}
          <div
            style={{
              ...styles.totalBox,
              borderTop: `2px solid ${ac.border}`,
            }}
          >
            <div style={styles.cantidadItemsRow}>
              🛒 {cantidadItems} {cantidadItems === 1 ? 'item' : 'items'}
            </div>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total</span>
              <span
                style={{
                  ...styles.totalMonto,
                  color: ac.total,
                }}
              >
                ${totalConDescuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <button
            style={{
              ...styles.btnFinalizar,
              background: ac.btn,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.18)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
            onClick={onFinalizarVenta}
          >
            Finalizar venta →
          </button>
        </>
      )}
    </div>
  )
}

const styles = {
  contenedor: {
    display: 'flex',
    flexDirection: 'column',
    background: 'white',
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    maxHeight: 'calc(100vh - 40px)',
  },
  titulo: { margin: '0 0 16px', fontSize: 18, color: '#15803d' },
  vacio: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: '#9ca3af', gap: 8
  },
  lista: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  subtotalRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '8px 0', borderTop: '1px solid #f0fdf4'
  },
  descuentoBox: {
    background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
    marginBottom: 8, border: '0.5px solid #e5e7eb'
  },
  descuentoHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8
  },
  descuentoLabel: { fontSize: 12, fontWeight: 600, color: '#374151' },
  descuentoManualRow: { display: 'flex', gap: 6, alignItems: 'center' },
  inputPct: {
    width: 70, padding: '5px 8px', borderRadius: 6, fontSize: 12,
    border: '1px solid #d1fae5', outline: 'none', textAlign: 'center'
  },
  btnAplicarManual: {
    padding: '5px 10px', borderRadius: 6, border: 'none',
    background: '#16a34a', color: 'white', cursor: 'pointer',
    fontSize: 11, fontWeight: 600
  },
  btnLimpiar: {
    padding: '5px 8px', borderRadius: 6, border: '1px solid #fecaca',
    background: 'white', color: '#dc2626', cursor: 'pointer', fontSize: 11
  },
  descuentoAplicado: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, padding: '6px 8px', background: '#dcfce7',
    borderRadius: 6
  },
  totalBox: {
    display: 'flex', flexDirection: 'column',
    padding: '12px 0', borderTop: '2px solid #dcfce7', marginTop: 4
  },
  cantidadItemsRow: {
    fontSize: 12, fontWeight: 600, color: '#6b7280',
    marginBottom: 4
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  totalLabel: { fontSize: 16, fontWeight: 600, color: '#374151' },
  totalMonto: { fontSize: 24, fontWeight: 800, color: '#15803d' },
  btnFinalizar: {
    width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
    background: '#16a34a', color: 'white', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', marginTop: 8
  },
}