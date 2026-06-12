import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoginScreen from './components/LoginScreen'
import BuscadorProductos from './components/BuscadorProductos'
import Carrito from './components/Carrito'
import ModalPago from './components/ModalPago'
import { useCarrito } from './hooks/useCarrito'
import { crearVenta, emitirFactura } from './api/api'
import HistorialVentas from './components/HistorialVentas'
import PanelStock from './components/PanelStock'
import ABMProductos from './components/ABMProductos'
import Reportes from './components/Reportes'
import { imprimirTicket as imprimirTicketFn } from './utils/imprimirTicket'
import { useDescuento } from './hooks/useDescuento'
import { useIsMobile } from './hooks/useIsMobile'


export default function App() {
  const { usuario, logout, cargando } = useAuth()
  const { items, total, agregar, cambiarCantidad, eliminar, vaciar } = useCarrito()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cargandoVenta, setCargandoVenta] = useState(false)
  const [ventaExitosa, setVentaExitosa] = useState(null)
  const [pantalla, setPantalla] = useState('pos')
  const isMobile = useIsMobile()
  const [mostrarCarrito, setMostrarCarrito] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const {
    descuento, promocion, cupon,
    aplicarPromocion, aplicarDescuentoManual,
    aplicarCupon, quitarCupon,
    limpiar: limpiarDescuento,
  } = useDescuento()

  const totalFinal = Math.max(0, total - descuento - (cupon?.monto || 0))

  // Función para obtener el color según el usuario:
  const colorHeader = () => {
    const veterinaria = usuario?.veterinaria || 'donato'

    if (veterinaria === 'alberdi') return '#c2410c'
    return '#15803d'
  }

  const colorAccent = () => {
    const veterinaria = usuario?.veterinaria || 'donato'

    if (veterinaria === 'alberdi') {
      return {
        primary: '#ea580c',
        dark: '#c2410c',
        light: '#fff7ed',
        border: '#fed7aa',

        borderFocus: '#f97316',
        badge: '#fff7ed',
        badgeText: '#c2410c',
        btn: '#ea580c',
        btnHover: '#c2410c',
      }
    }

    return {
      primary: '#16a34a',
      dark: '#15803d',
      light: '#f0fdf4',
      border: '#d1fae5',

      borderFocus: '#16a34a',
      badge: '#f0fdf4',
      badgeText: '#15803d',
      btn: '#16a34a',
      btnHover: '#15803d',
    }
  }

  const colorBody = () => {
    const veterinaria = usuario?.veterinaria || 'donato'

    if (veterinaria === 'alberdi') return '#fff7ed'
    return '#f0fdf4'
  }


  const handleFinalizarVenta = async ({ medioPago, pagos, modalidad, tipoCbte, imprimirTicket }) => {
    setCargandoVenta(true)
    try {
      // 1. Guardar la venta
      const payload = {
        medio_pago: medioPago,
        pagos,
        descuento: descuento + (cupon?.monto || 0),
        promocion_id: promocion?.id || null,
        items: items.map(i => ({
          producto_id: i.id,
          cantidad: i.cantidad,
          precio_unit: i.precio,
        })),
      }
      const resultado = await crearVenta(payload)
      const venta = resultado.venta

      let factura = null

      // 2. Si eligió facturar, pedir CAE a AFIP
      if (modalidad === 'factura') {
        try {
          factura = await emitirFactura({
            venta_id: venta.id,
            tipo_cbte: tipoCbte,
            punto_venta: 2,
          })
        } catch (factErr) {
          console.error('Error al facturar:', factErr.message)
          alert(
            `⚠️ Venta guardada pero la factura falló:\n` +
            `${factErr?.response?.data?.error || factErr.message}\n\n` +
            `Se imprimirá ticket de preventa.`
          )
        }
      }

      // 3. Imprimir ticket solo si el cajero lo eligió
      if (imprimirTicket) {
        imprimirTicketFn({
          venta: { ...venta, medio_pago: medioPago },
          items: items.map(i => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio_unit: i.precio,
          })),
          factura,
          descuento,
          pagos,
          negocio: {
            nombre: import.meta.env.VITE_NEGOCIO_NOMBRE || 'CanyFeliz Veterinaria',
            direccion: import.meta.env.VITE_NEGOCIO_DIRECCION || 'Tu dirección acá',
            cuit: import.meta.env.VITE_NEGOCIO_CUIT || '20-99999999-9',
            iva: import.meta.env.VITE_NEGOCIO_IVA || 'Responsable Inscripto',
          },
          cupon: cupon?.aplicado ? cupon : null,
        })
      }

      vaciar()
      limpiarDescuento()
      setModalAbierto(false)
      setVentaExitosa(resultado)

    } catch (err) {
      alert(err?.response?.data?.error || 'Error al procesar la venta')
    } finally {
      setCargandoVenta(false)
    }
  }

  if (cargando) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f0fdf4'
    }}>
      <p style={{ color: '#16a34a', fontSize: 18 }}>Cargando... 🐾</p>
    </div>
  )

  if (!usuario) return <LoginScreen />


  // Pantallas admin
  if (pantalla === 'stock') return <PanelStock onVolver={() => setPantalla('pos')} headerColor={colorHeader()} bodyColor={colorBody()} accent={colorAccent()} />
  if (pantalla === 'historial') return <HistorialVentas onVolver={() => setPantalla('pos')} headerColor={colorHeader()} bodyColor={colorBody()} accent={colorAccent()} />
  if (pantalla === 'abm') return <ABMProductos onVolver={() => setPantalla('pos')} headerColor={colorHeader()} bodyColor={colorBody()} accent={colorAccent()} />
  if (pantalla === 'reportes') return <Reportes onVolver={() => setPantalla('pos')} headerColor={colorHeader()} bodyColor={colorBody()} accent={colorAccent()} />

  return (
    <div style={{ ...styles.app, background: colorBody() }}>
      <header style={{ ...styles.header, background: colorHeader() }}>
        <h1 style={styles.logo}>🐾 CanyFeliz</h1>
        {!isMobile && <span style={styles.subtitulo}>Punto de Venta</span>}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Botón carrito mobile */}
          {isMobile && (
            <button
              style={{
                ...btnStyle, background: 'white', color: colorHeader(),
                fontWeight: 700, position: 'relative'
              }}
              onClick={() => setMostrarCarrito(true)}
            >
              🛒
              {items.length > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#dc2626', color: 'white', borderRadius: '50%',
                  width: 16, height: 16, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {items.length}
                </span>
              )}
            </button>
          )}

          {/* Desktop: botones normales */}
          {!isMobile && (
            <>
              <span style={{ fontSize: 13, opacity: 0.9 }}>
                {usuario.nombre}
                <span style={{
                  marginLeft: 6, fontSize: 10, background: 'rgba(255,255,255,0.2)',
                  padding: '2px 7px', borderRadius: 10
                }}>
                  {usuario.rol}
                </span>
              </span>
              <button onClick={logout} style={btnStyle}>Salir</button>
              {usuario.rol === 'admin' && (
                <>
                  <button style={btnStyle} onClick={() => setPantalla('historial')}>Historial</button>
                  <button style={btnStyle} onClick={() => setPantalla('stock')}>Stock</button>
                  <button style={btnStyle} onClick={() => setPantalla('abm')}>Productos</button>
                  <button style={btnStyle} onClick={() => setPantalla('reportes')}>Reportes</button>
                </>
              )}
            </>
          )}

          {/* Mobile: botón hamburguesa */}
          {isMobile && (
            <button
              style={{ ...btnStyle, fontSize: 18, padding: '4px 10px' }}
              onClick={() => setMenuAbierto(v => !v)}
            >
              {menuAbierto ? '✕' : '☰'}
            </button>
          )}
        </div>

        {/* Dropdown mobile */}
        {isMobile && menuAbierto && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: colorHeader(), borderTop: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', flexDirection: 'column', padding: '8px 16px 12px',
          }}>
            <div
              style={{
                fontSize: 13,
                color: 'white',
                opacity: 0.9,
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                marginBottom: 8
              }}
            >
              {usuario.nombre}

              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 7px',
                  borderRadius: 10,
                }}
              >
                {usuario.veterinaria === 'alberdi'
                  ? '🏥 Alberdi'
                  : '🏥 Donato'}
              </span>

              <span style={{ opacity: 0.7, marginLeft: 6 }}>
                {usuario.rol}
              </span>
            </div>
            {usuario.rol === 'admin' && (
              <>
                {[
                  { label: '📋 Historial', pantalla: 'historial' },
                  { label: '📦 Stock', pantalla: 'stock' },
                  { label: '🛍️ Productos', pantalla: 'abm' },
                  { label: '📊 Reportes', pantalla: 'reportes' },
                ].map(item => (
                  <button
                    key={item.pantalla}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: 'none',
                      color: 'white', padding: '10px 12px', borderRadius: 8,
                      cursor: 'pointer', fontSize: 14, textAlign: 'left',
                      marginBottom: 6,
                    }}
                    onClick={() => { setPantalla(item.pantalla); setMenuAbierto(false) }}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}
            <button
              style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', padding: '10px 12px', borderRadius: 8,
                cursor: 'pointer', fontSize: 14, textAlign: 'left', marginTop: 4,
              }}
              onClick={() => { logout(); setMenuAbierto(false) }}
            >
              🚪 Salir
            </button>
          </div>
        )}
      </header>

      <main
        style={{
          ...styles.main,
          gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
          maxWidth: isMobile ? '100%' : 1300,
          padding: isMobile ? '0 10px' : '0 20px',
        }}
      >
        <section style={styles.columnaIzq}>
          <h2 style={styles.seccionTitulo}>Buscar productos</h2>
          <BuscadorProductos
            onAgregar={agregar}
            accent={colorAccent()}
          />
        </section>

        {!isMobile && (
          <section style={styles.columnaDer}>
            <Carrito
              items={items}
              total={total}
              accent={colorAccent()}
              onCambiarCantidad={cambiarCantidad}
              onEliminar={eliminar}
              onFinalizarVenta={() => setModalAbierto(true)}
              descuento={descuento}
              promocion={promocion}
              onAplicarPromocion={aplicarPromocion}
              onDescuentoManual={aplicarDescuentoManual}
              onLimpiarDescuento={limpiarDescuento}
              cupon={cupon}
              onAplicarCupon={aplicarCupon}
              onQuitarCupon={quitarCupon}
            />

            {ventaExitosa && (
              <div style={styles.exitoBox}>
                <strong>✅ Venta #{ventaExitosa.venta.id} registrada</strong>
                <p>
                  Total cobrado: $
                  {Number(ventaExitosa.venta.total).toLocaleString('es-AR')}
                </p>
                <button
                  style={styles.btnCerrarExito}
                  onClick={() => setVentaExitosa(null)}
                >
                  Cerrar
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {isMobile && mostrarCarrito && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            background: 'rgba(0,0,0,0.4)',
          }}
          onClick={() => setMostrarCarrito(false)}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'white',
              borderRadius: '16px 16px 0 0',
              padding: 16,
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              

              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
                onClick={() => setMostrarCarrito(false)}
              >
                ✕
              </button>
            </div>

            <Carrito
              items={items}
              total={total}
              accent={colorAccent()}
              onCambiarCantidad={cambiarCantidad}
              onEliminar={eliminar}
              onFinalizarVenta={() => {
                setMostrarCarrito(false)
                setModalAbierto(true)
              }}
              descuento={descuento}
              promocion={promocion}
              onAplicarPromocion={aplicarPromocion}
              onDescuentoManual={aplicarDescuentoManual}
              onLimpiarDescuento={limpiarDescuento}
            />

            {ventaExitosa && (
              <div style={styles.exitoBox}>
                <strong>✅ Venta #{ventaExitosa.venta.id} registrada</strong>

                <p>
                  Total cobrado: $
                  {Number(ventaExitosa.venta.total).toLocaleString('es-AR')}
                </p>

                <button
                  style={styles.btnCerrarExito}
                  onClick={() => setVentaExitosa(null)}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalAbierto && (
        <ModalPago
          total={totalFinal}
          cargando={cargandoVenta}
          onConfirmar={handleFinalizarVenta}
          onCancelar={() => setModalAbierto(false)}
          accent={colorAccent()}
        />
      )}
    </div>
  )
}

const styles = {
  app: { minHeight: '100vh', background: '#f0fdf4', fontFamily: 'system-ui, sans-serif' },
  header: {
    color: 'white', padding: '14px 28px',
    display: 'flex', alignItems: 'center', gap: 14,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'relative',    // ← agregá esto
  },
  logo: { margin: 0, fontSize: 22, fontWeight: 800 },
  subtitulo: { fontSize: 14, opacity: 0.85 },
  main: {
    display: 'grid', gridTemplateColumns: '1fr 420px', gap: 20,
    maxWidth: 1300, margin: '24px auto', padding: '0 20px',
  },
  columnaIzq: {},
  columnaDer: { position: 'sticky', top: 20, height: 'fit-content' },
  seccionTitulo: { margin: '0 0 12px', fontSize: 16, color: '#374151' },
  exitoBox: {
    marginTop: 20, background: '#dcfce7', border: '1px solid #86efac',
    borderRadius: 10, padding: 16, color: '#15803d',
  },
  btnCerrarExito: {
    marginTop: 8, background: 'none', border: '1px solid #16a34a',
    borderRadius: 6, padding: '4px 12px', cursor: 'pointer', color: '#16a34a',
  },
}

const btnStyle = {
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.3)',
  color: 'white',
  borderRadius: 6,
  padding: '4px 12px',
  cursor: 'pointer',
  fontSize: 12,
}