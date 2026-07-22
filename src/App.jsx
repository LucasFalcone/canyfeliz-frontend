import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
import Clientes from './components/Clientes'

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
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false)
  const [hoverBtn, setHoverBtn] = useState(null)
  const columnaDerRef = useRef(null)
  const [columnaDerMax, setColumnaDerMax] = useState('calc(100vh - 40px)')

  const [modalSalir, setModalSalir] = useState(false)

  const handleLogout = () => {
    setModalSalir(true)
  }

  const confirmarSalir = () => {
    setModalSalir(false)
    logout()
  }

  // Mide cuánto espacio queda realmente hasta el borde inferior de la pantalla,
  // en vez de adivinar un número fijo (que no contempla la altura del header).
  useEffect(() => {
  if (isMobile) return

  const recalcular = () => {
    if (!columnaDerRef.current) return

    const top = columnaDerRef.current.getBoundingClientRect().top
    const disponible = window.innerHeight - top - 20

    setColumnaDerMax(Math.max(240, disponible))
  }

  recalcular()

  window.addEventListener('resize', recalcular)

  return () => window.removeEventListener('resize', recalcular)
}, [isMobile, items.length])


  const btnHover = (id) => ({
    transform: hoverBtn === id ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hoverBtn === id ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
    background: hoverBtn === id ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    transition: 'all 0.15s ease',
  })


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
        cliente_id: clienteSeleccionado?.id || null,
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
      setClienteSeleccionado(null)
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
      <p style={{ color: '#16a34a', fontSize: 20 }}>Cargando... 🐾</p>
    </div>
  )

  if (!usuario) return <LoginScreen />


  // Pantallas admin
  if (pantalla === 'stock') return <PanelStock onVolver={() => setPantalla('pos')} headerColor={colorHeader()} bodyColor={colorBody()} accent={colorAccent()} />
  if (pantalla === 'historial') return <HistorialVentas onVolver={() => setPantalla('pos')} headerColor={colorHeader()} bodyColor={colorBody()} accent={colorAccent()} />
  if (pantalla === 'abm') return <ABMProductos onVolver={() => setPantalla('pos')} headerColor={colorHeader()} bodyColor={colorBody()} accent={colorAccent()} />
  if (pantalla === 'clientes') return <Clientes onVolver={() => setPantalla('pos')} headerColor={colorHeader()} bodyColor={colorBody()} accent={colorAccent()} />
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
                  width: 18, height: 18, fontSize: 11, fontWeight: 700,
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
              <span style={{ fontSize: 14, opacity: 0.9 }}>
                {usuario.nombre}
                <span style={{
                  marginLeft: 7, fontSize: 11, background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px', borderRadius: 10
                }}>
                  {usuario.rol}
                </span>
              </span>

              {usuario.rol === 'admin' && (
                <>
                  <button
                    style={{
                      ...btnStyle,
                      ...btnHover('historial'),
                    }}
                    onMouseEnter={() => setHoverBtn('historial')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => setPantalla('historial')}
                  >
                    Historial
                  </button>
                  <button
                    style={{ ...btnStyle, ...btnHover('stock') }}
                    onMouseEnter={() => setHoverBtn('stock')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => setPantalla('stock')}
                  >
                    Stock
                  </button>
                  <button
                    style={{ ...btnStyle, ...btnHover('abm') }}
                    onMouseEnter={() => setHoverBtn('abm')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => setPantalla('abm')}
                  >
                    Productos
                  </button>

                  <button
                    style={{ ...btnStyle, ...btnHover('clientes') }}
                    onMouseEnter={() => setHoverBtn('clientes')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => setPantalla('clientes')}
                  >
                    Clientes
                  </button>

                  <button
                    style={{ ...btnStyle, ...btnHover('reportes') }}
                    onMouseEnter={() => setHoverBtn('reportes')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => setPantalla('reportes')}
                  >
                    Reportes
                  </button>

                  <button
                    style={{
                      ...btnStyle,
                      outline: 'none',
                      ...(hoverBtn === 'salir'
                        ? {
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                          background: 'rgba(255,255,255,0.22)',
                          border: '1px solid rgba(255,255,255,0.3)', // en vez de borderColor

                        }
                        : {}),
                    }}
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setHoverBtn('salir')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={handleLogout}
                  >
                    Salir
                  </button>

                </>
              )}
            </>
          )}

          {/* Mobile: botón hamburguesa */}
          {isMobile && (
            <button
              style={{ ...btnStyle, fontSize: 20, padding: '4px 11px' }}
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
            display: 'flex', flexDirection: 'column', padding: '9px 18px 13px',
          }}>
            <div
              style={{
                fontSize: 14,
                color: 'white',
                opacity: 0.9,
                padding: '9px 0',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                marginBottom: 9
              }}
            >
              {usuario.nombre}

              <span
                style={{
                  marginLeft: 7,
                  fontSize: 11,
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {usuario.veterinaria === 'alberdi'
                  ? '🏥 Alberdi'
                  : '🏥 Donato'}
              </span>

              <span style={{ opacity: 0.7, marginLeft: 7 }}>
                {usuario.rol}
              </span>
            </div>
            {usuario.rol === 'admin' && (
              <>
                {[
                  { label: '📋 Historial', pantalla: 'historial' },
                  { label: '📦 Stock', pantalla: 'stock' },
                  { label: '🛍️ Productos', pantalla: 'abm' },
                  { label: '👥 Clientes', pantalla: 'clientes' },
                  { label: '📊 Reportes', pantalla: 'reportes' },
                ].map(item => (
                  <button
                    key={item.pantalla}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: 'none',
                      color: 'white', padding: '11px 13px', borderRadius: 9,
                      cursor: 'pointer', fontSize: 15, textAlign: 'left',
                      marginBottom: 7,
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
                color: 'white', padding: '11px 13px', borderRadius: 9,
                cursor: 'pointer', fontSize: 15, textAlign: 'left', marginTop: 4,
              }}
              onClick={() => { handleLogout(); setMenuAbierto(false) }}
            >
              🚪 Salir
            </button>
          </div>
        )}
      </header>

      <main
        style={{
          ...styles.main,
          gridTemplateColumns: isMobile ? '1fr' : '1fr 500px',
          maxWidth: isMobile ? '100%' : 1520,
          padding: isMobile ? '0 10px' : '0 8px',
          overflowY: isMobile ? 'auto' : 'hidden',
        }}
      >
        <section style={styles.columnaIzq}>
         
          <BuscadorProductos
            onAgregar={agregar}
            accent={colorAccent()}
            modalClienteAbierto={modalClienteAbierto}
            refrescarTrigger={ventaExitosa?.venta?.id}
          />
        </section>

        {!isMobile && (
          <section style={{ ...styles.columnaDer, maxHeight: columnaDerMax }} ref={columnaDerRef}>
            <Carrito
              items={items}
              total={total}
              accent={colorAccent()}
              maxAltura={columnaDerMax}
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
              clienteSeleccionado={clienteSeleccionado}
              onSeleccionarCliente={setClienteSeleccionado}
              onQuitarCliente={() => setClienteSeleccionado(null)}
              onAbrirCliente={() => setModalClienteAbierto(true)}
              onCerrarCliente={() => setModalClienteAbierto(false)}
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
              borderRadius: '18px 18px 0 0',
              padding: 18,
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
                marginBottom: 13,
              }}
            >


              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
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
              clienteSeleccionado={clienteSeleccionado}
              onSeleccionarCliente={setClienteSeleccionado}
              onQuitarCliente={() => setClienteSeleccionado(null)}
              onAbrirCliente={() => setModalClienteAbierto(true)}
              onCerrarCliente={() => setModalClienteAbierto(false)}
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

      {modalSalir && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '28px 26px 22px',
            width: 340, maxWidth: '90vw', textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🚪</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
              ¿Seguro que quieres salir?
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: 14, color: '#6b7280' }}>
              Vas a cerrar tu sesión.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 9,
                  border: '1px solid #e5e7eb', background: 'white',
                  color: '#374151', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  ...(hoverBtn === 'cancelar-salir'
                    ? { background: '#f3f4f6', transform: 'translateY(-1px)', boxShadow: '0 3px 10px rgba(0,0,0,0.08)' }
                    : {}),
                }}
                onMouseEnter={() => setHoverBtn('cancelar-salir')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setModalSalir(false)}
              >
                Cancelar
              </button>
              <button
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 9,
                  border: 'none', background: colorAccent().btn,
                  color: 'white', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  ...(hoverBtn === 'confirmar-salir'
                    ? { background: colorAccent().btnHover, transform: 'translateY(-1px)', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }
                    : {}),
                }}
                onMouseEnter={() => setHoverBtn('confirmar-salir')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={confirmarSalir}
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const styles = {
  app: {
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: '#f0fdf4',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    color: 'white', padding: '15px 31px',
    display: 'flex', alignItems: 'center', gap: 15,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'relative',
    flexShrink: 0,
  },
  logo: { margin: 0, fontSize: 24, fontWeight: 800 },
  subtitulo: { fontSize: 15, opacity: 0.85 },
  main: {
    display: 'grid', gridTemplateColumns: '1fr 500px', gap: 20,
    maxWidth: 1520, margin: '24px auto', padding: '0 8px',
    flex: 1,
    minHeight: 0,
    width: '100%',
    boxSizing: 'border-box',
  },
  columnaIzq: {},
  columnaDer: {
    position: 'sticky',
    alignSelf: 'start',
    overflow: 'hidden',
  },
  seccionTitulo: { margin: '0 0 13px', fontSize: 18, color: '#374151' },
  exitoBox: {
    marginTop: 22, background: '#dcfce7', border: '1px solid #86efac',
    borderRadius: 11, padding: 18, color: '#15803d',
  },
  btnCerrarExito: {
    marginTop: 9, background: 'none', border: '1px solid #16a34a',
    borderRadius: 7, padding: '4px 13px', cursor: 'pointer', color: '#16a34a',
  },
}

const btnStyle = {
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.3)',
  color: 'white',
  borderRadius: 7,
  padding: '4px 13px',
  cursor: 'pointer',
  fontSize: 15,
  outline: 'none',
  boxShadow: 'none',
  transition: 'all 0.15s ease',
}