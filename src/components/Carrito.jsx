import { useState, useEffect } from 'react'
import { listarPromociones } from '../api/api'
import ItemCarrito from './ItemCarrito'

export default function Carrito({
  items,
  total,
  onCambiarCantidad,
  onEliminar,
  onFinalizarVenta,
  descuento,
  promocion,
  onAplicarPromocion,
  onDescuentoManual,
  onLimpiarDescuento,
  cupon,
  onAplicarCupon,
  onQuitarCupon,
  accent = {},
}) {
  const [promociones, setPromociones] = useState([])
  const [mostrarPromos, setMostrarPromos] = useState(false)
  const [pctManual, setPctManual] = useState('')
  const [inputCupon, setInputCupon] = useState('')
  const [inputMonto, setInputMonto] = useState('')

  const ac = {
    title: accent.badgeText || '#15803d',
    border: accent.border || '#d1fae5',
    btn: accent.btn || '#16a34a',
    total: accent.badgeText || '#15803d',
  }

  useEffect(() => {
    listarPromociones().then(setPromociones).catch(() => { })
  }, [])

  const totalConDescuento = Math.max(0, total - descuento - (cupon?.monto || 0))

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

          {/* Sección descuentos */}
          <div style={styles.descuentoBox}>
            <div style={styles.descuentoHeader}>
              <span style={styles.descuentoLabel}>🏷️ Descuentos</span>
             
            </div>

            {/* Descuento manual por % */}
            <div style={styles.descuentoManualRow}>
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
                style={styles.btnAplicarManual}
                onClick={() => onDescuentoManual(pctManual, total)}
                disabled={!pctManual}
              >
                Aplicar %
              </button>
              {descuento > 0 && (
                <button style={styles.btnLimpiar} onClick={() => {
                  onLimpiarDescuento()
                  setPctManual('')
                }}>
                  ✕ Quitar
                </button>
              )}
            </div>

            <div style={{
              background: '#fafafa', 
              marginBottom: 8, 
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
                🎟️ Cupón
              </div>

              {cupon?.aplicado ? (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#dcfce7', borderRadius: 6, padding: '6px 10px',
                }}>
                  <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                    ✅ {cupon.codigo} — −${cupon.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#dc2626', fontSize: 12
                    }}
                    onClick={onQuitarCupon}
                  >
                    ✕ Quitar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>

                  <input
                    style={styles.inputPct}
                    type="number"
                    placeholder="$ monto"
                    value={inputMonto}
                    onChange={e => setInputMonto(e.target.value)}
                  />
                  <button
                    style={{
                      padding: '5px 10px', borderRadius: 6, border: 'none',
                      background: '#16a34a', color: 'white', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600
                    }}
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

            {/* Lista de promociones */}
            {mostrarPromos && (
              <div style={styles.promoLista}>
                {promociones.length === 0 && (
                  <p style={{ fontSize: 12, color: '#9ca3af', padding: 8 }}>
                    No hay promociones activas.
                  </p>
                )}
                {promociones.map(p => (
                  <button
                    key={p.id}
                    style={{
                      ...styles.promoBtn,
                      ...(promocion?.id === p.id ? styles.promoBtnActivo : {}),
                    }}
                    onClick={() => {
                      onAplicarPromocion(p, items, total)
                      setMostrarPromos(false)
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{p.nombre}</span>
                    <span style={styles.promoTipo}>
                      {p.tipo === 'porcentaje' ? `${p.valor}% off` :
                        p.tipo === 'monto_fijo' ? `$${p.valor} off` :
                          p.tipo === '2x1' ? '2x1' :
                            p.tipo === 'categoria' ? `${p.valor}% en ${p.categoria}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Descuento aplicado */}
            {descuento > 0 && (
              <div style={styles.descuentoAplicado}>
                <span style={{ fontSize: 12, color: '#15803d' }}>
                  {promocion ? `✅ ${promocion.nombre}` : '✅ Descuento manual'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                  − ${descuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Total final */}
          <div
            style={{
              ...styles.totalBox,
              borderTop: `2px solid ${ac.border}`,
            }}
          >
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

          <button
            style={{
              ...styles.btnFinalizar,
              background: ac.btn,
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
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'white', borderRadius: 14, padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)'
  },
  titulo: { margin: '0 0 16px', fontSize: 18, color: '#15803d' },
  vacio: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: '#9ca3af', gap: 8
  },
  lista: { flex: 1, overflowY: 'auto', maxHeight: 280 },
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
  btnTogglePromos: {
    fontSize: 11, padding: '3px 8px', borderRadius: 5,
    border: '1px solid #d1fae5', background: 'white',
    cursor: 'pointer', color: '#15803d'
  },
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
  promoLista: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 },
  promoBtn: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 10px', borderRadius: 7, border: '1px solid #e5e7eb',
    background: 'white', cursor: 'pointer', textAlign: 'left'
  },
  promoBtnActivo: { borderColor: '#16a34a', background: '#f0fdf4' },
  promoTipo: { fontSize: 11, color: '#16a34a', fontWeight: 600 },
  descuentoAplicado: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, padding: '6px 8px', background: '#dcfce7',
    borderRadius: 6
  },
  totalBox: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderTop: '2px solid #dcfce7', marginTop: 4
  },
  totalLabel: { fontSize: 16, fontWeight: 600, color: '#374151' },
  totalMonto: { fontSize: 24, fontWeight: 800, color: '#15803d' },
  btnFinalizar: {
    width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
    background: '#16a34a', color: 'white', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', marginTop: 8
  },
}