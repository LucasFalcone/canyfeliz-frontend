import { useState, useEffect } from 'react'
import {
  buscarClientes, getCliente, crearCliente,
  actualizarCliente, agregarMascota, actualizarMascota,
} from '../api/api'

const ESPECIES = [
  { value: 'perro', label: '🐶 Perro' },
  { value: 'gato',  label: '🐱 Gato' },
  { value: 'ave',   label: '🦜 Ave' },
  { value: 'otro',  label: '🐾 Otro' },
]

const FORM_CLIENTE_VACIO = {
  nombre: '', telefono: '', email: '', dni: '', direccion: '', notas: ''
}
const FORM_MASCOTA_VACIO = {
  nombre: '', especie: 'perro', raza: '', fecha_nac: '',
  sexo: '', peso: '', color: '', notas: ''
}

function calcularEdad(fecha) {
  if (!fecha) return null
  const hoy   = new Date()
  const nac   = new Date(fecha)
  const años  = hoy.getFullYear() - nac.getFullYear()
  const meses = hoy.getMonth() - nac.getMonth()
  if (años === 0) return `${meses + (meses < 0 ? 12 : 0)} meses`
  return `${años} año${años !== 1 ? 's' : ''}`
}

export default function Clientes({ onVolver }) {
  const [clientes,   setClientes]   = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [busqueda,   setBusqueda]   = useState('')
  const [detalle,    setDetalle]    = useState(null)   // cliente seleccionado
  const [modal,      setModal]      = useState(null)   // 'cliente' | 'mascota' | editar objeto
  const [form,       setForm]       = useState(FORM_CLIENTE_VACIO)
  const [formMascota, setFormMascota] = useState(FORM_MASCOTA_VACIO)
  const [guardando,  setGuardando]  = useState(false)
  const [toast,      setToast]      = useState(null)
  const [editMascota, setEditMascota] = useState(null)

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

  const abrirDetalle = async (id) => {
    const data = await getCliente(id)
    setDetalle(data)
  }

  const handleGuardarCliente = async () => {
    if (!form.nombre.trim()) return
    setGuardando(true)
    try {
      if (modal === 'cliente') {
        await crearCliente(form)
        mostrarToast('Cliente creado')
      } else {
        await actualizarCliente(modal.id, form)
        mostrarToast('Cliente actualizado')
        abrirDetalle(modal.id)
      }
      setModal(null)
      cargar(busqueda)
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'Error', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleGuardarMascota = async () => {
    if (!formMascota.nombre.trim()) return
    setGuardando(true)
    try {
      if (editMascota) {
        await actualizarMascota(detalle.id, editMascota.id, formMascota)
        mostrarToast('Mascota actualizada')
      } else {
        await agregarMascota(detalle.id, formMascota)
        mostrarToast('Mascota agregada')
      }
      setModal(null)
      setEditMascota(null)
      abrirDetalle(detalle.id)
    } catch (err) {
      mostrarToast(err?.response?.data?.error || 'Error', 'error')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={s.pantalla}>
      <header style={s.header}>
        <button style={s.hbtn} onClick={onVolver}>← POS</button>
        <h1 style={s.htitulo}>Clientes y Mascotas</h1>
        <button style={s.btnNuevo} onClick={() => {
          setForm(FORM_CLIENTE_VACIO)
          setModal('cliente')
        }}>
          + Nuevo cliente
        </button>
      </header>

      {toast && (
        <div style={{
          ...s.toast,
          background: toast.tipo === 'ok' ? '#dcfce7' : '#fef2f2',
          color:      toast.tipo === 'ok' ? '#15803d' : '#dc2626',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={s.body}>
        <div style={s.layout}>

          {/* Lista de clientes */}
          <div style={s.lista}>
            <input
              style={s.searchInput}
              placeholder="Buscar por nombre, DNI o teléfono..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />

            {cargando && <p style={s.msg}>Cargando...</p>}

            {clientes.map(c => (
              <div
                key={c.id}
                style={{
                  ...s.clienteCard,
                  ...(detalle?.id === c.id ? s.clienteCardActivo : {}),
                }}
                onClick={() => abrirDetalle(c.id)}
              >
                <div style={s.clienteNombre}>{c.nombre}</div>
                <div style={s.clienteMeta}>
                  {c.telefono && <span>{c.telefono}</span>}
                  {c.cantidad_mascotas > 0 && (
                    <span>🐾 {c.cantidad_mascotas} mascota{c.cantidad_mascotas !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            ))}

            {!cargando && clientes.length === 0 && (
              <p style={s.msg}>No se encontraron clientes.</p>
            )}
          </div>

          {/* Detalle del cliente */}
          {detalle ? (
            <div style={s.detalle}>
              {/* Cabecera */}
              <div style={s.detalleHeader}>
                <div>
                  <h2 style={s.detalleTitulo}>{detalle.nombre}</h2>
                  <div style={s.detalleMeta}>
                    {detalle.telefono && <span>📞 {detalle.telefono}</span>}
                    {detalle.email    && <span>✉️ {detalle.email}</span>}
                    {detalle.dni      && <span>🪪 {detalle.dni}</span>}
                  </div>
                  {detalle.notas && (
                    <p style={s.detalleNotas}>{detalle.notas}</p>
                  )}
                </div>
                <button
                  style={s.btnEditar}
                  onClick={() => {
                    setForm({
                      nombre:    detalle.nombre,
                      telefono:  detalle.telefono || '',
                      email:     detalle.email    || '',
                      dni:       detalle.dni      || '',
                      direccion: detalle.direccion || '',
                      notas:     detalle.notas    || '',
                    })
                    setModal(detalle)
                  }}
                >
                  Editar
                </button>
              </div>

              {/* Mascotas */}
              <div style={s.seccion}>
                <div style={s.seccionHeader}>
                  <h3 style={s.seccionTitulo}>🐾 Mascotas</h3>
                  <button
                    style={s.btnAgregar}
                    onClick={() => {
                      setFormMascota(FORM_MASCOTA_VACIO)
                      setEditMascota(null)
                      setModal('mascota')
                    }}
                  >
                    + Agregar
                  </button>
                </div>

                {detalle.mascotas?.length === 0 && (
                  <p style={s.msgSeccion}>No hay mascotas registradas.</p>
                )}

                <div style={s.mascotasGrid}>
                  {detalle.mascotas?.map(m => (
                    <div key={m.id} style={s.mascotaCard}>
                      <div style={s.mascotaIcono}>
                        {m.especie === 'perro' ? '🐶' :
                         m.especie === 'gato'  ? '🐱' :
                         m.especie === 'ave'   ? '🦜' : '🐾'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={s.mascotaNombre}>{m.nombre}</div>
                        <div style={s.mascotaMeta}>
                          {m.raza && <span>{m.raza}</span>}
                          {m.fecha_nac && <span>{calcularEdad(m.fecha_nac)}</span>}
                          {m.peso && <span>{m.peso} kg</span>}
                          {m.sexo && <span>{m.sexo}</span>}
                        </div>
                        {m.notas && <p style={s.mascotaNotas}>{m.notas}</p>}
                      </div>
                      <button
                        style={s.btnEditarMascota}
                        onClick={() => {
                          setFormMascota({
                            nombre:    m.nombre,
                            especie:   m.especie,
                            raza:      m.raza      || '',
                            fecha_nac: m.fecha_nac ? m.fecha_nac.split('T')[0] : '',
                            sexo:      m.sexo      || '',
                            peso:      m.peso      || '',
                            color:     m.color     || '',
                            notas:     m.notas     || '',
                          })
                          setEditMascota(m)
                          setModal('mascota')
                        }}
                      >
                        Editar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historial de compras */}
              <div style={s.seccion}>
                <h3 style={s.seccionTitulo}>🧾 Historial de compras</h3>
                {detalle.ventas?.length === 0 && (
                  <p style={s.msgSeccion}>Sin compras registradas.</p>
                )}
                {detalle.ventas?.map(v => (
                  <div key={v.id} style={s.ventaRow}>
                    <span style={s.ventaFecha}>
                      {new Date(v.fecha).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                      })}
                    </span>
                    <span style={s.ventaItems}>
                      {(v.items || []).map(i => i.nombre).join(', ')}
                    </span>
                    <span style={s.ventaTotal}>
                      ${Number(v.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={s.detalleVacio}>
              <span style={{ fontSize: 48 }}>🐾</span>
              <p>Seleccioná un cliente para ver sus datos</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal cliente */}
      {modal !== null && modal !== 'mascota' && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <h3 style={s.modalTitulo}>
              {modal === 'cliente' ? '+ Nuevo cliente' : `Editar — ${modal.nombre}`}
            </h3>

            {[
              { key: 'nombre',    label: 'Nombre *',    placeholder: 'María González' },
              { key: 'telefono',  label: 'Teléfono',    placeholder: '11-5555-1234' },
              { key: 'email',     label: 'Email',        placeholder: 'maria@email.com' },
              { key: 'dni',       label: 'DNI',          placeholder: '30123456' },
              { key: 'direccion', label: 'Dirección',    placeholder: 'Av. Siempreviva 742' },
            ].map(f => (
              <div key={f.key}>
                <label style={s.lbl}>{f.label}</label>
                <input
                  style={s.inp}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            ))}

            <label style={s.lbl}>Notas</label>
            <textarea
              style={{ ...s.inp, height: 64, resize: 'vertical' }}
              value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              placeholder="Observaciones..."
            />

            <div style={s.modalBtns}>
              <button style={s.btnCancelar} onClick={() => setModal(null)}>Cancelar</button>
              <button style={s.btnConfirmar} onClick={handleGuardarCliente} disabled={guardando}>
                {guardando ? 'Guardando...' : modal === 'cliente' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal mascota */}
      {modal === 'mascota' && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <h3 style={s.modalTitulo}>
              {editMascota ? `Editar — ${editMascota.nombre}` : '+ Nueva mascota'}
            </h3>

            <label style={s.lbl}>Nombre *</label>
            <input style={s.inp} value={formMascota.nombre}
              onChange={e => setFormMascota(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Firulais" />

            <label style={s.lbl}>Especie</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              {ESPECIES.map(e => (
                <button
                  key={e.value}
                  style={{
                    ...s.especieBtn,
                    ...(formMascota.especie === e.value ? s.especieBtnOn : {}),
                  }}
                  onClick={() => setFormMascota(p => ({ ...p, especie: e.value }))}
                >
                  {e.label}
                </button>
              ))}
            </div>

            {[
              { key: 'raza',     label: 'Raza',         placeholder: 'Labrador', type: 'text' },
              { key: 'fecha_nac',label: 'Fecha de nac.', placeholder: '',        type: 'date' },
              { key: 'peso',     label: 'Peso (kg)',     placeholder: '28.5',    type: 'number' },
              { key: 'color',    label: 'Color',         placeholder: 'Negro',   type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label style={s.lbl}>{f.label}</label>
                <input style={s.inp} type={f.type}
                  value={formMascota[f.key]}
                  onChange={e => setFormMascota(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} />
              </div>
            ))}

            <label style={s.lbl}>Sexo</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              {['macho', 'hembra'].map(sx => (
                <button key={sx} style={{
                  ...s.especieBtn,
                  ...(formMascota.sexo === sx ? s.especieBtnOn : {}),
                }} onClick={() => setFormMascota(p => ({ ...p, sexo: sx }))}>
                  {sx.charAt(0).toUpperCase() + sx.slice(1)}
                </button>
              ))}
            </div>

            <label style={s.lbl}>Notas clínicas</label>
            <textarea style={{ ...s.inp, height: 60, resize: 'vertical' }}
              value={formMascota.notas}
              onChange={e => setFormMascota(p => ({ ...p, notas: e.target.value }))}
              placeholder="Alergias, medicación, observaciones..." />

            <div style={s.modalBtns}>
              <button style={s.btnCancelar} onClick={() => { setModal(null); setEditMascota(null) }}>
                Cancelar
              </button>
              <button style={s.btnConfirmar} onClick={handleGuardarMascota} disabled={guardando}>
                {guardando ? 'Guardando...' : editMascota ? 'Guardar' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pantalla:       { minHeight: '100vh', background: '#f0fdf4', fontFamily: 'system-ui, sans-serif' },
  header:         { background: '#15803d', color: 'white', padding: '12px 20px',
                    display: 'flex', alignItems: 'center', gap: 12 },
  hbtn:           { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 12 },
  htitulo:        { fontSize: 16, fontWeight: 700, margin: 0, flex: 1 },
  btnNuevo:       { background: 'white', color: '#15803d', border: 'none', borderRadius: 7,
                    padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  toast:          { padding: '10px 20px', fontSize: 13, borderBottom: '1px solid rgba(0,0,0,0.06)' },
  body:           { padding: '16px 20px', maxWidth: 1100, margin: '0 auto' },
  layout:         { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 600 },
  lista:          { display: 'flex', flexDirection: 'column', gap: 6 },
  searchInput:    { width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1.5px solid #d1fae5', fontSize: 13, outline: 'none',
                    background: 'white', marginBottom: 4 },
  msg:            { textAlign: 'center', color: '#6b7280', padding: 20, fontSize: 13 },
  clienteCard:    { background: 'white', borderRadius: 9, padding: '10px 12px',
                    border: '0.5px solid #d1fae5', cursor: 'pointer' },
  clienteCardActivo: { border: '2px solid #16a34a', background: '#f0fdf4' },
  clienteNombre:  { fontWeight: 600, fontSize: 13, color: '#111827' },
  clienteMeta:    { display: 'flex', gap: 10, fontSize: 11, color: '#6b7280', marginTop: 2 },
  detalle:        { background: 'white', borderRadius: 12, padding: 20,
                    border: '0.5px solid #d1fae5', overflowY: 'auto' },
  detalleVacio:   { display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', color: '#9ca3af', gap: 8, fontSize: 14 },
  detalleHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    marginBottom: 20 },
  detalleTitulo:  { fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 6px' },
  detalleMeta:    { display: 'flex', gap: 14, fontSize: 13, color: '#6b7280', flexWrap: 'wrap' },
  detalleNotas:   { fontSize: 12, color: '#6b7280', marginTop: 6, fontStyle: 'italic' },
  btnEditar:      { fontSize: 12, padding: '5px 12px', borderRadius: 6,
                    border: '1px solid #d1fae5', background: 'white', cursor: 'pointer' },
  seccion:        { marginBottom: 24 },
  seccionHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 10 },
  seccionTitulo:  { fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 },
  btnAgregar:     { fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none',
                    background: '#16a34a', color: 'white', cursor: 'pointer' },
  msgSeccion:     { fontSize: 13, color: '#9ca3af', padding: '8px 0' },
  mascotasGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 },
  mascotaCard:    { background: '#f9fafb', borderRadius: 9, padding: '10px 12px',
                    border: '0.5px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'flex-start' },
  mascotaIcono:   { fontSize: 24 },
  mascotaNombre:  { fontWeight: 600, fontSize: 13, color: '#111827' },
  mascotaMeta:    { display: 'flex', gap: 8, fontSize: 11, color: '#6b7280',
                    flexWrap: 'wrap', marginTop: 2 },
  mascotaNotas:   { fontSize: 11, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
  btnEditarMascota:{ fontSize: 10, padding: '3px 7px', borderRadius: 5,
                    border: '1px solid #d1fae5', background: 'white', cursor: 'pointer',
                    marginTop: 4, alignSelf: 'flex-start' },
  ventaRow:       { display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0',
                    borderBottom: '0.5px solid #f0fdf4', fontSize: 13 },
  ventaFecha:     { color: '#6b7280', minWidth: 80, fontSize: 12 },
  ventaItems:     { flex: 1, color: '#374151', fontSize: 12,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ventaTotal:     { fontWeight: 700, color: '#15803d', minWidth: 80, textAlign: 'right' },
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modalBox:       { background: 'white', borderRadius: 14, padding: 24, width: 380,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    maxHeight: '90vh', overflowY: 'auto' },
  modalTitulo:    { fontSize: 16, fontWeight: 700, color: '#15803d', margin: '0 0 14px' },
  lbl:            { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151',
                    margin: '8px 0 3px' },
  inp:            { width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 13,
                    border: '1.5px solid #d1fae5', outline: 'none', color: '#111',
                    background: 'white' },
  modalBtns:      { display: 'flex', gap: 8, marginTop: 16 },
  btnCancelar:    { flex: 1, padding: 10, borderRadius: 7, border: '1px solid #e5e7eb',
                    background: 'white', cursor: 'pointer', fontSize: 13 },
  btnConfirmar:   { flex: 2, padding: 10, borderRadius: 7, border: 'none',
                    background: '#16a34a', color: 'white', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700 },
  especieBtn:     { padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
                    background: 'white', cursor: 'pointer', fontSize: 12 },
  especieBtnOn:   { borderColor: '#16a34a', background: '#f0fdf4', fontWeight: 600 },
}