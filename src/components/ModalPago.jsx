import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'

const MEDIOS = [
  { id: 'efectivo', label: '💵 Efectivo' },
  { id: 'debito', label: '💳 Débito' },
  { id: 'credito', label: '💳 Crédito' },
  { id: 'transferencia', label: '📱 Transferencia' },
  { id: 'qr_frances', label: '🏦 QR Francés' },
  { id: 'qr_posnet', label: '📟 QR Posnet' },
]


const TIPOS_CBTE = [
  { value: 6, label: 'Factura B — Consumidor final' },
  { value: 1, label: 'Factura A — Responsable inscripto' },
  { value: 11, label: 'Factura C — Monotributista' },
]




const qrS = {
  wrap: {
    display: 'flex', gap: 12, alignItems: 'center', background: '#f9fafb',
    border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', marginBottom: 10
  },
  info: { display: 'flex', flexDirection: 'column', gap: 3 },
  titular: { fontSize: 12, fontWeight: 700, color: '#111827', margin: 0 },
  dato: { fontSize: 10, color: '#6b7280', margin: 0 },
  monto: { fontSize: 13, color: '#374151', margin: '4px 0 0' },
}



export default function ModalPago({ total, onConfirmar, onCancelar, cargando, accent = {} }) {
  const [modoPago, setModoPago] = useState('simple')  // 'simple' | 'combinado'
  const [medioPago, setMedioPago] = useState('efectivo')
  const [pagos, setPagos] = useState([
    { medio_pago: 'efectivo', monto: '' },
    { medio_pago: 'debito', monto: '' },
  ])
  const [modalidad, setModalidad] = useState(null)
  const [tipoCbte, setTipoCbte] = useState(6)
  const [imprimirTicket, setImprimirTicket] = useState(true)
  const [hoverBtn, setHoverBtn] = useState(null)

  const buttonHoverStyle = (id, base) => ({
    ...base,
    transform: hoverBtn === id ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hoverBtn === id ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.15s ease',
  })

  const ac = {
    primary: accent.primary || '#16a34a',
    dark: accent.dark || '#15803d',
    light: accent.light || '#f0fdf4',
    border: accent.border || '#d1fae5',
  }

  const s = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    },
    modal: {
      background: 'white', borderRadius: 16, padding: 28, width: 430,
      boxShadow: '0 8px 40px rgba(0,0,0,0.15)', maxHeight: '92vh', overflowY: 'auto'
    },
    titulo: { margin: '0 0 12px', fontSize: 20, color: ac.dark },
    totalTexto: { margin: '0 0 14px', fontSize: 16 },
    label: { margin: '0 0 7px', fontSize: 12, color: '#6b7280', fontWeight: 600 },
    modoRow: { display: 'flex', gap: 7, marginBottom: 14 },
    modoBtn: {
      flex: 1,
      padding: '8px 10px',
      borderRadius: 8,

      borderWidth: '1.5px',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',

      background: 'white',
      cursor: 'pointer',
      fontSize: 13
    },
    modoBtnOn: {
      borderColor: ac.primary,
      background: ac.light,
      fontWeight: 700,
      color: ac.dark,
    },
    mediosGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 12 },
    medioBtn: {
      padding: '9px 8px',
      borderRadius: 8,
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',
      background: 'white',
      cursor: 'pointer',
      fontSize: 13
    },
    medioBtnActivo: { borderColor: ac.primary, background: ac.light, fontWeight: 700 },
    combinadoWrap: { marginBottom: 12 },
    pagoRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 },
    pagoSelect: {
      flex: 1,
      padding: '7px 8px',
      borderRadius: 7,

      borderWidth: '1.5px',
      borderStyle: 'solid',
      borderColor: ac.border,

      fontSize: 12,
      outline: 'none',
      background: 'white',
      color: '#111'
    },
    pagoSign: { padding: '0 6px', fontSize: 13, color: '#6b7280', background: '#f9fafb' },
    pagoInputWrap: {
      display: 'flex',
      alignItems: 'center',

      borderWidth: '1.5px',
      borderStyle: 'solid',
      borderColor: ac.border,

      borderRadius: 7,
      overflow: 'hidden',
      background: 'white'
    },
    btnCompletar: {
      padding: '6px 9px',
      borderRadius: 6,

      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: ac.border,

      background: ac.light,
      cursor: 'pointer',
      fontSize: 14,
      color: ac.dark
    },
    btnQuitar: {
      padding: '6px 8px',
      borderRadius: 6,

      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#fecaca',

      background: 'white',
      cursor: 'pointer',
      fontSize: 12,
      color: '#dc2626'
    },
    btnAgregarMedio: {
      width: '100%',
      padding: '7px',
      borderRadius: 7,

      borderWidth: '1px',
      borderStyle: 'dashed',
      borderColor: ac.border,

      background: 'white',
      cursor: 'pointer',
      fontSize: 12,
      color: ac.primary,
      marginBottom: 10
    },
    resumenPagos: {
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'solid',
      padding: '8px 12px',
      marginBottom: 10,
    },
    resumenRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalidadGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
    modalidadBtn: {
      padding: '10px 8px',
      borderRadius: 10,

      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',

      background: 'white',
      cursor: 'pointer',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
    },
    modalidadBtnActivo: {
      background: ac.light,
      borderColor: ac.primary,
    },
    modalidadIcono: { fontSize: 20 },
    modalidadNombre: { fontSize: 12, fontWeight: 700, color: '#374151' },
    modalidadDesc: { fontSize: 10, color: '#9ca3af' },
    tipoCbteWrap: {
      background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
      marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6
    },
    tipoCbteBtn: {
      padding: '8px 12px',
      borderRadius: 7,

      borderWidth: '1.5px',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',

      background: 'white',
      cursor: 'pointer',
      fontSize: 12,
      textAlign: 'left',
      color: '#374151'
    },
    tipoCbteBtnActivo: {
      borderColor: ac.primary,
      background: ac.light,
      fontWeight: 700,
      color: ac.dark,
    },
    checkRow: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 0',

      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: ac.border,

      marginBottom: 8
    },
    checkLabel: {
      fontSize: 13, color: '#374151', cursor: 'pointer',
      display: 'flex', alignItems: 'center'
    },
    acciones: { display: 'flex', gap: 10 },
    btnCancelar: {
      flex: 1,
      padding: 12,
      borderRadius: 8,

      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',

      background: 'white',
      cursor: 'pointer',
      fontSize: 14
    },
    btnConfirmar: {
      flex: 2,
      padding: 12,
      borderRadius: 8,
      border: 'none',
      background: ac.primary,
      color: 'white',
      cursor: 'pointer',
      fontSize: 15,
      fontWeight: 700
    },
  }

  const totalPagos = pagos.reduce((a, p) => a + (parseFloat(p.monto) || 0), 0)
  const diferencia = total - totalPagos
  const pagoValido = modoPago === 'simple'
    ? true
    : Math.abs(diferencia) < 0.01

  const handleConfirmar = () => {
    if (!modalidad) return

    const pagosFinales = modoPago === 'combinado'
      ? pagos.filter(p => parseFloat(p.monto) > 0)
      : [{ medio_pago: medioPago, monto: total }]

    onConfirmar({
      medioPago: modoPago === 'simple' ? medioPago : 'mixto',
      pagos: pagosFinales,
      modalidad,
      tipoCbte: modalidad === 'factura' ? tipoCbte : null,
      imprimirTicket,
    })
  }

  const actualizarPago = (idx, campo, valor) => {
    setPagos(prev => prev.map((p, i) =>
      i === idx ? { ...p, [campo]: valor } : p
    ))
  }

  const agregarMedio = () => {
    setPagos(prev => [...prev, { medio_pago: 'efectivo', monto: '' }])
  }

  const quitarMedio = (idx) => {
    setPagos(prev => prev.filter((_, i) => i !== idx))
  }

  // Autocompletar el último campo con el resto
  const completarResto = (idx) => {
    const resto = total - pagos.reduce((a, p, i) =>
      i !== idx ? a + (parseFloat(p.monto) || 0) : a, 0)
    if (resto > 0) actualizarPago(idx, 'monto', resto.toFixed(2))
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h2 style={s.titulo}>Confirmar venta</h2>

        <p style={s.totalTexto}>
          Total:{' '}
          <strong style={{ color: ac.dark, fontSize: 26 }}>
            ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </strong>
        </p>

        {/* Toggle simple / combinado */}
        <div style={s.modoRow}>
          <button
            style={buttonHoverStyle('modo-simple', { ...s.modoBtn, ...(modoPago === 'simple' ? s.modoBtnOn : {}) })}
            onMouseEnter={() => setHoverBtn('modo-simple')}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={() => setModoPago('simple')}
          >
            Un solo medio
          </button>
          <button
            style={buttonHoverStyle('modo-combinado', { ...s.modoBtn, ...(modoPago === 'combinado' ? s.modoBtnOn : {}) })}
            onMouseEnter={() => setHoverBtn('modo-combinado')}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={() => setModoPago('combinado')}
          >
            🔀 Combinar medios
          </button>
        </div>

        {/* MODO SIMPLE */}
        {modoPago === 'simple' && (
          <>
            <p style={s.label}>Medio de pago</p>
            <div style={s.mediosGrid}>
              {MEDIOS.map(m => (
                <button
                  key={m.id}
                  style={buttonHoverStyle(`medio-${m.id}`, { ...s.medioBtn, ...(medioPago === m.id ? s.medioBtnActivo : {}) })}
                  onMouseEnter={() => setHoverBtn(`medio-${m.id}`)}
                  onMouseLeave={() => setHoverBtn(null)}
                  onClick={() => setMedioPago(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

          </>
        )}

        {/* MODO COMBINADO */}
        {modoPago === 'combinado' && (
          <div style={s.combinadoWrap}>
            {pagos.map((pago, idx) => (
              <div key={idx} style={s.pagoRow}>
                <select
                  style={s.pagoSelect}
                  value={pago.medio_pago}
                  onChange={e => actualizarPago(idx, 'medio_pago', e.target.value)}
                >
                  {MEDIOS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <div style={s.pagoInputWrap}>
                  <span style={s.pagoSign}>$</span>
                  <input
                    style={s.pagoInput}
                    type="number"
                    min="0"
                    step="0.01"
                    value={pago.monto}
                    onChange={e => actualizarPago(idx, 'monto', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <button
                  style={buttonHoverStyle(`completar-${idx}`, s.btnCompletar)}
                  onMouseEnter={() => setHoverBtn(`completar-${idx}`)}
                  onMouseLeave={() => setHoverBtn(null)}
                  onClick={() => completarResto(idx)}
                  title="Completar con el resto"
                >
                  ↩
                </button>
                {pagos.length > 2 && (
                  <button
                    style={buttonHoverStyle(`quitar-${idx}`, s.btnQuitar)}
                    onMouseEnter={() => setHoverBtn(`quitar-${idx}`)}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() => quitarMedio(idx)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              style={buttonHoverStyle('agregar-medio', s.btnAgregarMedio)}
              onMouseEnter={() => setHoverBtn('agregar-medio')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={agregarMedio}
            >
              + Agregar medio
            </button>

            {/* Resumen */}
            <div
              style={{
                ...s.resumenPagos,
                borderColor: pagoValido ? ac.border : '#fecaca',
                background: pagoValido ? ac.light : '#fef2f2',
              }}
            >
              <div style={s.resumenRow}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Total ingresado</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  ${totalPagos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {!pagoValido && (
                <div style={s.resumenRow}>
                  <span style={{ fontSize: 12, color: diferencia > 0 ? '#d97706' : '#dc2626' }}>
                    {diferencia > 0 ? `Falta: $${diferencia.toFixed(2)}` : `Excede: $${Math.abs(diferencia).toFixed(2)}`}
                  </span>
                </div>
              )}
              {pagoValido && (
                <span style={{ fontSize: 11, color: ac.dark }}>✅ Montos correctos</span>
              )}
            </div>


          </div>
        )}

        {/* Tipo de comprobante */}
        <p style={{ ...s.label, marginTop: 14 }}>Tipo de comprobante</p>
        <div style={s.modalidadGrid}>
          <button
            style={buttonHoverStyle('modalidad-preventa', {
              ...s.modalidadBtn,
              ...(modalidad === 'preventa' ? s.modalidadBtnActivo : {})
            })}
            onMouseEnter={() => setHoverBtn('modalidad-preventa')}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={() => setModalidad('preventa')}
          >
            <span style={s.modalidadIcono}>🧾</span>
            <span style={s.modalidadNombre}>Ticket / Preventa</span>
            <span style={s.modalidadDesc}>Sin factura</span>
          </button>
          <button
            style={buttonHoverStyle('modalidad-factura', {
              ...s.modalidadBtn,
              ...(modalidad === 'factura' ? s.modalidadBtnActivo : {})
            })}
            onMouseEnter={() => setHoverBtn('modalidad-factura')}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={() => setModalidad('factura')}
          >
            <span style={s.modalidadIcono}>📄</span>
            <span style={s.modalidadNombre}>Factura electrónica</span>
            <span style={s.modalidadDesc}>Con CAE — ARCA</span>
          </button>
        </div>

        {modalidad === 'factura' && (
          <div style={s.tipoCbteWrap}>
            <p style={s.label}>Tipo de factura</p>
            {TIPOS_CBTE.map(t => (
              <button
                key={t.value}
                style={buttonHoverStyle(`cbte-${t.value}`, { ...s.tipoCbteBtn, ...(tipoCbte === t.value ? s.tipoCbteBtnActivo : {}) })}
                onMouseEnter={() => setHoverBtn(`cbte-${t.value}`)}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setTipoCbte(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Imprimir ticket */}
        <div style={s.checkRow}>
          <label style={s.checkLabel}>
            <input
              type="checkbox"
              checked={imprimirTicket}
              onChange={e => setImprimirTicket(e.target.checked)}
              style={{ marginRight: 7 }}
            />
            Imprimir ticket al finalizar
          </label>
        </div>

        <div style={s.acciones}>
          <button
            style={buttonHoverStyle('cancelar', s.btnCancelar)}
            onMouseEnter={() => setHoverBtn('cancelar')}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={onCancelar}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            style={buttonHoverStyle('confirmar', {
              ...s.btnConfirmar,
              opacity: (!modalidad || (modoPago === 'combinado' && !pagoValido)) ? 0.5 : 1,
            })}
            onMouseEnter={() => setHoverBtn('confirmar')}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={handleConfirmar}
            disabled={cargando || !modalidad || (modoPago === 'combinado' && !pagoValido)}
          >
            {cargando ? 'Procesando...' : 'Confirmar venta →'}
          </button>
        </div>
      </div>
    </div>
  )
}