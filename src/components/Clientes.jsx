import { useState, useEffect } from 'react'
import { buscarClientes, crearCliente, actualizarCliente, eliminarCliente } from '../api/api'

const TIPOS_DOC = ['dni', 'cuit', 'pasaporte']
const TIPOS_IVA = [
  { value: 'consumidor_final', label: 'Consumidor Final' },
  { value: 'exento', label: 'Exento' },
  { value: 'no_responsable', label: 'No Responsable' },
  { value: 'responsable_monotributo', label: 'Responsable Monotributo' },
  { value: 'responsable_inscripto', label: 'Responsable Inscripto' },
  { value: 'responsable_monotributo_a', label: 'Responsable Monotributo (Factura A)' },
]

const FORM_VACIO = {
  tipo_doc: 'dni',
  nro_doc: '',
  razon_social: '',
  nombre_comercial: '',
  telefono: '',
  email: '',
  tipo_iva: 'consumidor_final',
  domicilio: '',
  pais: 'Argentina',
  provincia: '',
  localidad: '',
  codigo_postal: '',
}

export default function Clientes({ onVolver, headerColor = '#15803d', bodyColor = '#f0fdf4', accent = {} }) {
  const ac = {
    primary: headerColor,
    border: accent.border || '#d1fae5',
    light: bodyColor,
    btn: accent.btn || '#16a34a',
    text: accent.badgeText || '#15803d',
  }

  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmEl, setConfirmEl] = useState(null)
  const [hoverBtn, setHoverBtn] = useState(null)

  const btnHover = (id) => ({
    transform: hoverBtn === id ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hoverBtn === id ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.15s ease',
  })

  const cargar = async (q = '') => {
    setCargando(true)
    const data = await buscarClientes(q)
    setClientes(data)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const mostrarToast = (msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  const handleGuardar = async () => {
    if (!form.razon_social.trim()) return setError('Razón social requerida')
    setGuardando(true)
    setError(null)
    try {
      if (modal === 'nuevo') {
        await crearCliente(form)
        mostrarToast('Cliente creado')
      } else {
        await actualizarCliente(modal.id, form)
        mostrarToast('Cliente actualizado')
      }
      setModal(null)
      cargar(busqueda)
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (c) => {
    try {
      await eliminarCliente(c.id)
      mostrarToast('Cliente eliminado', 'warn')
      setConfirmEl(null)
      cargar(busqueda)
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'Error', 'error')
    }
  }

  const abrirEditar = (c) => {
    setForm({
      tipo_doc: c.tipo_doc || 'dni',
      nro_doc: c.nro_doc || '',
      razon_social: c.razon_social || '',
      nombre_comercial: c.nombre_comercial || '',
      telefono: c.telefono || '',
      email: c.email || '',
      tipo_iva: c.tipo_iva || 'consumidor_final',
      domicilio: c.domicilio || '',
      pais: c.pais || 'Argentina',
      provincia: c.provincia || '',
      localidad: c.localidad || '',
      codigo_postal: c.codigo_postal || '',
    })
    setError(null)
    setModal(c)
  }

  return (
    <div style={{ minHeight: '100vh', background: ac.light, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{
        background: ac.primary, color: 'white', padding: '13px 22px',
        display: 'flex', alignItems: 'center', gap: 13, position: 'sticky', top: 0, zIndex: 100,
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
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>Clientes</h1>
        <button
          style={{
            background: 'white', color: ac.primary, border: 'none',
            borderRadius: 8, padding: '7px 15px', cursor: 'pointer',
            fontSize: 16, fontWeight: 700
          }}
          onClick={() => { setForm(FORM_VACIO); setError(null); setModal('nuevo') }}
        >
          + Nuevo cliente
        </button>
      </header>

      {toast && (
        <div style={{
          padding: '12px 23px', fontSize: 15, borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: toast.tipo === 'ok' ? '#dcfce7' : toast.tipo === 'warn' ? '#fef9c3' : '#fef2f2',
          color: toast.tipo === 'ok' ? '#15803d' : toast.tipo === 'warn' ? '#854d0e' : '#dc2626',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1069, margin: '23px auto', padding: '0 20px' }}>
        <input
          style={{
            width: '100%', padding: '11px 14px', borderRadius: 10, marginBottom: 16,
            border: `1.5px solid ${ac.border}`, fontSize: 15, outline: 'none',
            background: 'white'
          }}
          placeholder="Buscar por razón social, nombre comercial o documento..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          autoComplete="new-password"
        />

        {cargando && <p style={s.msg}>Cargando...</p>}
        {!cargando && clientes.length === 0 && <p style={s.msg}>No se encontraron clientes.</p>}

        {clientes.map(c => (
          <div key={c.id} style={{
            background: 'white', borderRadius: 12, marginBottom: 10,
            border: `0.5px solid ${ac.border}`, padding: '14px 20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>
                  {c.razon_social}
                </div>
                {c.nombre_comercial && (
                  <div style={{ fontSize: 14, color: '#6b7280' }}>{c.nombre_comercial}</div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                  {c.nro_doc && (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      {c.tipo_doc?.toUpperCase()}: {c.nro_doc}
                    </span>
                  )}
                  {c.telefono && (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      📞 {c.telefono}
                    </span>
                  )}

                  {c.email && (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      ✉️ {c.email}
                    </span>
                  )}
                  <span style={{
                    fontSize: 13, padding: '1px 9px', borderRadius: 11,
                    background: ac.light, color: ac.text, fontWeight: 500
                  }}>
                    {TIPOS_IVA.find(t => t.value === c.tipo_iva)?.label || c.tipo_iva}
                  </span>
                  {c.localidad && (
                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                      📍 {c.localidad}{c.provincia ? `, ${c.provincia}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={{
                    fontSize: 15,
                    padding: '5px 11px',
                    borderRadius: 5,
                    border: `1px solid ${ac.border}`,
                    background: 'white',
                    cursor: 'pointer',
                    ...btnHover(`editar-${c.id}`),
                  }}
                  onMouseEnter={() => setHoverBtn(`editar-${c.id}`)}
                  onMouseLeave={() => setHoverBtn(null)}
                  onClick={() => abrirEditar(c)}
                >
                  Editar
                </button>
                <button
                  style={{
                    fontSize: 15,
                    padding: '5px 11px',
                    borderRadius: 5,
                    border: '1px solid #fecaca',
                    background: 'white',
                    color: '#dc2626',
                    cursor: 'pointer',
                    ...btnHover(`eliminar-${c.id}`),
                  }}
                  onMouseEnter={() => setHoverBtn(`eliminar-${c.id}`)}
                  onMouseLeave={() => setHoverBtn(null)}
                  onClick={() => setConfirmEl(c)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal crear/editar */}
      {modal !== null && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, width: 546 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: ac.primary, margin: '0 0 20px' }}>
              {modal === 'nuevo' ? '+ Nuevo cliente' : `Editar — ${modal.razon_social}`}
            </h3>

            {/* Tipo y número de documento */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <div>
                <label style={s.lbl}>Tipo doc.</label>
                <select style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
                  value={form.tipo_doc}
                  onChange={e => setForm(f => ({ ...f, tipo_doc: e.target.value }))}>
                  {TIPOS_DOC.map(t => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.lbl}>Número</label>
                <input style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
                  value={form.nro_doc}
                  onChange={e => setForm(f => ({ ...f, nro_doc: e.target.value }))}
                  placeholder="20-12345678-9"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <label style={s.lbl}>Razón social *</label>
            <input style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
              value={form.razon_social}
              onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))}
              placeholder="Juan García"
              autoFocus
              autoComplete="new-password"
            />

            <label style={s.lbl}>Nombre comercial</label>

            <input style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
              value={form.nombre_comercial}
              onChange={e => setForm(f => ({ ...f, nombre_comercial: e.target.value }))}
              placeholder="Ej: Pet Shop García"
              autoComplete="new-password"
            />

            <label style={s.lbl}>Teléfono</label>
            <input
              style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
              value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              placeholder="11 1234-5678"
              autoComplete="new-password"
            />

            <label style={s.lbl}>Email</label>
            <input
              style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="cliente@email.com"
              autoComplete="new-password"
            />

            <label style={s.lbl}>Tipo de IVA</label>
            <select style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
              value={form.tipo_iva}
              onChange={e => setForm(f => ({ ...f, tipo_iva: e.target.value }))}>
              {TIPOS_IVA.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <label style={s.lbl}>Domicilio</label>
            <input style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
              value={form.domicilio}
              onChange={e => setForm(f => ({ ...f, domicilio: e.target.value }))}
              placeholder="Av. Siempreviva 742"
              autoComplete="new-password"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.lbl}>País</label>
                <input style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
                  value={form.pais}
                  onChange={e => setForm(f => ({ ...f, pais: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label style={s.lbl}>Provincia</label>
                <input style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
                  value={form.provincia}
                  onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))}
                  placeholder="Buenos Aires"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <div>
                <label style={s.lbl}>Localidad</label>
                <input style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
                  value={form.localidad}
                  onChange={e => setForm(f => ({ ...f, localidad: e.target.value }))}
                  placeholder="CABA"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label style={s.lbl}>Código postal</label>
                <input style={{ ...s.inp, border: `1.5px solid ${ac.border}` }}
                  value={form.codigo_postal}
                  onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value }))}
                  placeholder="1425"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: 15, marginTop: 10 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                style={{
                  ...s.btnCancelar,
                  ...btnHover('cancelar-cliente'),
                }}
                onMouseEnter={() => setHoverBtn('cancelar-cliente')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                style={{
                  ...s.btnConfirmar,
                  background: ac.btn,
                  ...btnHover('guardar-cliente'),
                  opacity: guardando ? 0.7 : 1,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={() => setHoverBtn('guardar-cliente')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : modal === 'nuevo' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {confirmEl && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', margin: '0 0 14px' }}>
              Eliminar cliente
            </h3>
            <p style={{ fontSize: 16, color: '#374151', marginBottom: 23 }}>
              ¿Eliminar <strong>{confirmEl.razon_social}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  ...s.btnCancelar,
                  ...btnHover('cancelar-eliminar'),
                }}
                onMouseEnter={() => setHoverBtn('cancelar-eliminar')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => setConfirmEl(null)}
              >
                Cancelar
              </button>
              <button
                style={{
                  ...s.btnConfirmar,
                  background: '#dc2626',
                  ...btnHover('confirmar-eliminar'),
                }}
                onMouseEnter={() => setHoverBtn('confirmar-eliminar')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => handleEliminar(confirmEl)}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  hbtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 8, borderRadius: 8,
    padding: '8px 16px', cursor: 'pointer', fontSize: 14,
  },
  msg: { textAlign: 'center', color: '#6b7280', padding: 36 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
  },
  modal: {
    background: 'white', borderRadius: 16, padding: 28, width: 439,
    boxShadow: '0 9px 34px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto'
  },
  lbl: { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', margin: '12px 0 5px' },
  inp: {
    width: '100%', padding: '10px 12px', borderRadius: 9, fontSize: 15,
    outline: 'none', color: '#111', background: 'white'
  },
  btnCancelar: {
    flex: 1, padding: 12, borderRadius: 9, border: '1px solid #e5e7eb',
    background: 'white', cursor: 'pointer', fontSize: 15
  },
  btnConfirmar: {
    flex: 2, padding: 12, borderRadius: 9, border: 'none',
    background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 700
  },
}