import { useState, useEffect } from 'react'
import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  subirImagen,
  eliminarImagen,
} from '../api/api'
import { useIsMobile } from '../hooks/useIsMobile'

import {
  CATEGORIAS,
  SUBCATEGORIAS,
  labelCategoria,
  tieneSubcategorias,
  ETIQUETAS_DEFAULT,
  EDADES,
} from '../utils/categorias'

const FORM_VACIO = {
  nombre: '',
  precio: '',
  codigo: '',
  categoria: 'balanceado',
  precio_costo: '',
  margen: '',
  subcategoria: '',
  etiqueta: '',
  droga: '',
  precio_efectivo: '',
  edad: '',
  mordida: '',
}

const CATEGORIAS_SERVICIO = [
  'consultorio',
  'cirugias_y_especialidades'
]

function diasHasta(f) {
  return Math.ceil((new Date(f) - new Date()) / 86400000)
}

function fmtFecha(f) {
  const [, mes, dia] = String(f).split('T')[0].split('-')
  return `${dia}/${mes}`
}

export default function ABMProductos({ onVolver, headerColor = '#15803d', bodyColor = '#f0fdf4', accent = {} }) {

  const isMobile = useIsMobile()
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)

  const [busqueda, setBusqueda] = useState('')
  const [catFiltro, setCatFiltro] = useState('todas')
  const [subFiltro, setSubFiltro] = useState('')
  const [etiquetaFiltro, setEtiquetaFiltro] = useState('')

  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const [toast, setToast] = useState(null)

  const [confirmEl, setConfirmEl] = useState(null)
  const [subiendoImg, setSubiendoImg] = useState(false)

  const [hoverChip, setHoverChip] = useState(null)
  const [hoverBtn, setHoverBtn] = useState(null)

  const btnHover = (id) => ({
    transform: hoverBtn === id ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hoverBtn === id
      ? '0 4px 10px rgba(0,0,0,0.08)'
      : 'none',
    transition: 'all 0.15s ease',
  })

  const chipStyle = (active, key) => ({
    ...s.catBtn,
    ...s.hoverBtn,
    fontSize: 11,

    ...(active ? catBtnOnStyle : {}),
    ...(hoverChip === key && !active
      ? {
        transform: 'translateY(-1px)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',

      }
      : {}),
  })

  const ac = {
    border: accent.border || '#d1fae5',
    focus: accent.borderFocus || '#16a34a',
    badge: accent.badge || '#f0fdf4',
    badgeText: accent.badgeText || '#15803d',
    btn: accent.btn || '#16a34a',
  }

  const catBtnOnStyle = {
    background: ac.focus,
    color: 'white',
    border: `1px solid ${ac.focus}`,
    fontWeight: 600,
  }

  const cargar = () => {
    setCargando(true)

    listarProductos()
      .then(setProductos)
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  const mostrarToast = (msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const esServicio = (categoria) =>
    CATEGORIAS_SERVICIO.includes(categoria)


  const abrirNuevo = () => {
    setForm(FORM_VACIO)
    setError(null)
    setModal('nuevo')
  }

  const abrirEditar = (p) => {
    setForm({
      nombre: p.nombre,
      precio: p.precio,
      codigo: p.codigo || '',
      categoria: p.categoria || 'balanceado',
      precio_costo: p.precio_costo || '',
      margen: p.margen || '',
      subcategoria: p.subcategoria || '',
      etiqueta: p.etiqueta || '',
      droga: p.droga || '',
      precio_efectivo: p.precio_efectivo || '',
      edad: p.edad || '',
      mordida: p.mordida || '',
    })

    setError(null)
    setModal(p)
  }

  const handleGuardar = async () => {
    if (!form.nombre.trim() || !form.precio) {
      return setError(
        'Nombre y precio son obligatorios'
      )
    }

    setGuardando(true)
    setError(null)

    try {
      const payload = {
        nombre: form.nombre.trim(),
        precio: parseFloat(form.precio),
        codigo: form.codigo.trim() || null,
        categoria: form.categoria,
        precio_costo: parseFloat(form.precio_costo) || 0,
        margen: parseFloat(form.margen) || 0,
        subcategoria: form.subcategoria || null,
        etiqueta: form.etiqueta || null,
        droga: form.droga || null,
        precio_efectivo: parseFloat(form.precio_efectivo) || null,
        edad: form.edad || null,
        mordida: form.mordida || null,
      }

      if (modal === 'nuevo') {
        await crearProducto(payload)
        mostrarToast('Producto creado correctamente')
      } else {
        await actualizarProducto(modal.id, payload)
        mostrarToast('Producto actualizado')
      }

      setModal(null)
      cargar()

    } catch (err) {
      console.error('Error completo:', err)

      setError(
        err?.response?.data?.error ||
        err.message ||
        'Error al guardar'
      )

    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (producto) => {
    try {
      const r = await eliminarProducto(producto.id)

      mostrarToast(r.mensaje, 'warn')

      setConfirmEl(null)
      cargar()

    } catch (err) {
      mostrarToast(
        err?.response?.data?.error ||
        'Error al eliminar',
        'error'
      )
    }
  }

  const handleSubirImagen = async (e, productoId) => {
    const file = e.target.files[0]

    if (!file) return

    setSubiendoImg(true)

    try {
      const prod = await subirImagen(productoId, file)

      setProductos(prev =>
        prev.map(p =>
          p.id === prod.id
            ? { ...p, imagen_url: prod.imagen_url }
            : p
        )
      )

      if (modal && modal.id === prod.id) {
        setModal({
          ...modal,
          imagen_url: prod.imagen_url,
        })
      }

      mostrarToast('Imagen actualizada')

    } catch (err) {
      mostrarToast(
        'Error al subir imagen',
        'error'
      )

    } finally {
      setSubiendoImg(false)
    }
  }

  const handleEliminarImagen = async (productoId) => {
    try {
      await eliminarImagen(productoId)

      setProductos(prev =>
        prev.map(p =>
          p.id === productoId
            ? { ...p, imagen_url: null }
            : p
        )
      )

      if (modal && modal.id === productoId) {
        setModal({
          ...modal,
          imagen_url: null,
        })
      }

      mostrarToast(
        'Imagen eliminada',
        'warn'
      )

    } catch {
      mostrarToast(
        'Error al eliminar imagen',
        'error'
      )
    }
  }

  const productosFiltrados = productos.filter(p => {
    const matchCat =
      catFiltro === 'todas' ||
      p.categoria === catFiltro

    const matchSub =
      !subFiltro ||
      p.subcategoria === subFiltro

    const matchEtiqueta =
      !etiquetaFiltro ||
      p.etiqueta === etiquetaFiltro

    const matchQ =
      p.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase()) ||

      (p.codigo || '').includes(busqueda)

    return (
      matchCat &&
      matchSub &&
      matchEtiqueta &&
      matchQ
    )
  })

  const etiquetasDisponibles = [...new Set(
    productos
      .filter(
        p =>
          catFiltro === 'todas' ||
          p.categoria === catFiltro
      )
      .map(p => p.etiqueta)
      .filter(Boolean)
  )]

  const agrupados =
    catFiltro === 'todas'
      ? CATEGORIAS
        .map(c => ({
          ...c,
          items: productosFiltrados.filter(
            p => p.categoria === c.value
          ),
        }))
        .filter(c => c.items.length > 0)

      : [{
        value: catFiltro,
        label: labelCategoria(catFiltro),
        items: productosFiltrados,
      }]

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

        <h1 style={s.htitulo}>
          ABM de Productos
        </h1>

        <button
          style={{
            ...s.btnNuevo,
            color: ac.badgeText,
          }}
          onClick={abrirNuevo}
        >
          + Nuevo producto
        </button>
      </header>

      {toast && (
        <div
          style={{
            ...s.toast,

            background:
              toast.tipo === 'ok'
                ? '#dcfce7'
                : toast.tipo === 'warn'
                  ? '#fef9c3'
                  : '#fef2f2',

            color:
              toast.tipo === 'ok'
                ? '#15803d'
                : toast.tipo === 'warn'
                  ? '#854d0e'
                  : '#dc2626',
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={s.body}>
        <div style={s.filtroRow}>

          <input
            style={{
              ...s.searchInput,
              border: `1.5px solid ${ac.border}`,
            }}
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={e =>
              setBusqueda(e.target.value)
            }
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />

          <div style={s.catBtns}>
            <button
              style={{
                ...s.catBtn,
                ...(catFiltro === 'todas'
                  ? {
                    ...catBtnOnStyle,
                    background: ac.focus,
                    border: `1px solid ${ac.focus}`,
                  }
                  : {}),
              }}

              onClick={() => {
                setCatFiltro('todas')
                setSubFiltro('')
                setEtiquetaFiltro('')
              }}
            >
              Todas
            </button>

            {CATEGORIAS.map(c => (
              <button
                key={c.value}
                style={chipStyle(catFiltro === c.value, `cat-${c.value}`)}
                onMouseEnter={() => setHoverChip(`cat-${c.value}`)}
                onMouseLeave={() => setHoverChip(null)}
                onFocus={(e) => {
                  e.currentTarget.style.outline = 'none'
                  e.currentTarget.style.boxShadow = 'none'
                }}
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


          {/* Filtro por subcategoría — solo si la categoría tiene marcas */}
          {tieneSubcategorias(catFiltro) && catFiltro !== 'farmacia' && (
            <div style={{ ...s.catBtns, marginTop: 6 }}>
              <button
                style={{ ...s.catBtn, fontSize: 11, ...(subFiltro === '' ? catBtnOnStyle : {}) }}
                onClick={() => setSubFiltro('')}
              >
                Todas las marcas
              </button>
              {SUBCATEGORIAS[catFiltro].map(sub => (
                <button
                  key={sub.value}
                  style={chipStyle(subFiltro === sub.value, `sub-${sub.value}`)}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  onMouseEnter={() => setHoverChip(`sub-${sub.value}`)}
                  onMouseLeave={() => setHoverChip(null)}
                  onClick={() => {
                    setSubFiltro(sub.value)
                    setEtiquetaFiltro('')
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Farmacia: filtrar por etiqueta en vez de marca */}
          {catFiltro === 'farmacia' && etiquetasDisponibles.length > 0 && (
            <div style={{ ...s.catBtns, marginTop: 6 }}>
              <button
                style={{ ...s.catBtn, fontSize: 11, ...(etiquetaFiltro === '' ? catBtnOnStyle : {}) }}
                onClick={() => setEtiquetaFiltro('')}
              >
                Todas
              </button>
              {etiquetasDisponibles.map(e => (
                <button
                  key={e}
                  style={{ ...s.catBtn, fontSize: 11, ...(etiquetaFiltro === e ? catBtnOnStyle : {}) }}
                  onClick={() => setEtiquetaFiltro(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <span style={s.count}>{productosFiltrados.length} productos</span>
        </div>

        {cargando && <p style={s.msg}>Cargando productos...</p>}

        {!cargando && agrupados.map(grupo => (
          <div key={grupo.value} style={s.grupo}>
            <div
              style={{
                ...s.grupoHeader,
                color: ac.badgeText,
                borderBottom: `2px solid ${ac.border}`,
              }}
            >{grupo.label}</div>

            {isMobile ? (
              // ── CARDS MOBILE ──
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grupo.items.map(p => (
                  <div
                    key={p.id}
                    style={{
                      background: 'white',
                      borderRadius: 10,
                      padding: '12px 14px',
                      border: '0.5px solid #e5e7eb',
                      opacity: p.activo === false ? 0.5 : 1,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    {p.imagen_url ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${p.imagen_url}`}
                        alt={p.nombre}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 8,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid #e5e7eb',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 8,
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          flexShrink: 0,
                        }}
                      >
                        📦
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: '#111827',
                          marginBottom: 4,
                          wordBreak: 'break-word',
                        }}
                      >
                        {p.nombre}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          flexWrap: 'wrap',
                          marginBottom: 6,
                        }}
                      >
                        <span style={s.precio}>
                          $
                          {Number(p.precio).toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>

                        {esServicio(p.categoria) ? (
                          <span style={s.servicioTag}>Servicio</span>
                        ) : (
                          <span style={s.stockBadge(p.stock_real ?? p.stock)}>
                            Stock: {p.stock_real ?? p.stock}
                          </span>
                        )}

                        {p.etiqueta && (
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: '#eff6ff',
                              color: '#3b82f6',
                              fontWeight: 500,
                            }}
                          >
                            {p.etiqueta}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button
                          style={s.btnEditar}
                          onClick={() => abrirEditar(p)}
                        >
                          Editar
                        </button>

                       

                        <button
                          style={s.btnEliminar}
                          onClick={() => setConfirmEl(p)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // ── TABLA DESKTOP ──
              <div
                style={{
                  ...s.tableWrap,
                  border: `0.5px solid ${ac.border}`,
                }}
              >
                <table style={s.tabla}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 50 }}>Foto</th>
                      <th style={s.th}>Nombre</th>
                      <th style={s.th}>Marca / Proveedor</th>
                      <th style={s.th}>Categoría</th>

                      {['balanceado', 'alimento_por_peso'].includes(grupo.value) && (
                        <th style={s.th}>Edad</th>
                      )}

                      {grupo.value === 'farmacia' && (
                        <th style={s.th}>Droga</th>
                      )}

                      <th style={s.th}>Código</th>
                      <th style={s.th}>Costo</th>
                      <th style={s.th}>Margen</th>
                      <th style={s.th}>Precio</th>

                      {grupo.value === 'consultorio' && (
                        <th style={s.th}>Precio efectivo</th>
                      )}

                      <th style={s.th}>Stock</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {grupo.items.map(p => (
                      <tr
                        key={p.id}
                        style={{ opacity: p.activo === false ? 0.5 : 1 }}
                      >
                        <td style={s.td}>
                          {p.imagen_url ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${p.imagen_url}`}
                              alt={p.nombre}
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                                objectFit: 'cover',
                                border: '1px solid #e5e7eb',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                                background: '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                              }}
                            >
                              📦
                            </div>
                          )}
                        </td>

                        <td style={s.td}>
                          <strong>{p.nombre}</strong>
                        </td>

                        <td style={s.td}>
                          <span style={s.codigo}>
                            {p.subcategoria
                              ? (
                                SUBCATEGORIAS[p.categoria]?.find(
                                  s => s.value === p.subcategoria
                                )?.label || p.subcategoria
                              )
                              : '—'}
                          </span>
                        </td>

                        <td style={s.td}>
                          {p.etiqueta ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: '#eff6ff',
                                color: '#3b82f6',
                                fontWeight: 500,
                              }}
                            >
                              {p.etiqueta}
                            </span>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>

                        {['balanceado', 'alimento_por_peso'].includes(grupo.value) && (
                          <td style={s.td}>
                            {p.edad ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: '#fef9c3',
                                  color: '#854d0e',
                                  fontWeight: 500,
                                }}
                              >
                                {p.edad}
                              </span>
                            ) : (
                              <span style={{ color: '#d1d5db' }}>—</span>
                            )}
                          </td>
                        )}

                        {grupo.value === 'farmacia' && (
                          <td style={s.td}>
                            <span
                              style={{
                                fontSize: 11,
                                color: '#6b7280',
                                fontStyle: p.droga ? 'normal' : 'italic',
                              }}
                            >
                              {p.droga || '—'}
                            </span>
                          </td>
                        )}

                        <td style={s.td}>
                          <span style={s.codigo}>{p.codigo || '—'}</span>
                        </td>

                        <td style={s.td}>
                          {p.precio_costo > 0 ? (
                            <span style={{ fontSize: 12, color: '#6b7280' }}>
                              $
                              {Number(p.precio_costo).toLocaleString('es-AR', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {p.margen > 0 ? (
                            <span style={{ fontSize: 12, color: '#6b7280' }}>
                              {p.margen}%
                            </span>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>

                        <td style={s.td}>
                          <span style={s.precio}>
                            $
                            {Number(p.precio).toLocaleString('es-AR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {grupo.value === 'consultorio' && (
                          <td style={s.td}>
                            {p.precio_efectivo ? (
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: '#15803d',
                                }}
                              >
                                $
                                {Number(p.precio_efectivo).toLocaleString('es-AR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <span style={{ color: '#d1d5db' }}>—</span>
                            )}
                          </td>
                        )}

                        <td style={s.td}>
                          {esServicio(p.categoria) ? (
                            <span style={s.servicioTag}>Servicio</span>
                          ) : (
                            <span style={s.stockBadge(p.stock_real ?? p.stock)}>
                              {p.stock_real ?? p.stock}
                            </span>
                          )}
                        </td>

                        <td style={s.td}>
                          <span style={s.estadoBadge(p.activo)}>
                            {p.activo !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              style={{
                                ...s.btnEditar,
                                border: `1px solid ${ac.border}`,
                                transform: hoverBtn === `editar-${p.id}` ? 'translateY(-1px)' : 'translateY(0)',
                                boxShadow: hoverBtn === `editar-${p.id}` ? '0 4px 10px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all .15s ease',
                                outline: 'none',
                              }}
                              onMouseEnter={() => setHoverBtn(`editar-${p.id}`)}
                              onMouseLeave={() => setHoverBtn(null)}
                              onClick={() => abrirEditar(p)}
                            >
                              Editar
                            </button>

                            <button
                              style={{
                                ...s.btnEliminar,
                                ...btnHover(`eliminar-${p.id}`),
                              }}
                              onMouseEnter={() => setHoverBtn(`eliminar-${p.id}`)}
                              onMouseLeave={() => setHoverBtn(null)}
                              onClick={() => setConfirmEl(p)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}

        {!cargando && productosFiltrados.length === 0 && (
          <p style={s.msg}>No hay productos en esta categoría.</p>
        )}
      </div>

      {/* ── Modal crear/editar ── */}
      {modal !== null && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3
              style={{
                ...s.modalTitulo,
                color: ac.badgeText,
              }}
            >
              {modal === 'nuevo'
                ? '+ Nuevo producto'
                : `Editar — ${modal.nombre}`}
            </h3>

            <label style={s.lbl}>Categoría *</label>
            <select
              style={{
                ...s.inp,
                border: `1.5px solid ${ac.border}`,
              }}
              value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value, subcategoria: '' }))}
            >
              {CATEGORIAS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {esServicio(form.categoria) && (
              <p style={s.servicioAviso}>
                Esta categoría es un servicio — no maneja stock ni lotes.
              </p>
            )}

            {/* Subcategoría / Marca / Laboratorio */}
            {(tieneSubcategorias(form.categoria) || form.categoria === 'farmacia') && (
              <>
                <label style={s.lbl}>Categoría del producto</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  {(ETIQUETAS_DEFAULT[form.categoria] || []).map(e => (
                    <button
                      key={e}
                      style={chipStyle(form.etiqueta === e, `etq-${e}`)}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = 'none'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      onMouseEnter={() => setHoverChip(`etq-${e}`)}
                      onMouseLeave={() => setHoverChip(null)}
                      onClick={() =>
                        setForm(f => ({
                          ...f,
                          etiqueta: f.etiqueta === e ? '' : e
                        }))
                      }
                    >
                      {e}
                    </button>
                  ))}
                </div>

                <input
                  style={{
                    ...s.inp,
                    border: `1.5px solid ${ac.border}`,
                  }}

                  value={form.etiqueta}
                  onChange={e => setForm(f => ({ ...f, etiqueta: e.target.value }))}
                  placeholder="O escribí una nueva categoría..."
                />


                {['balanceado', 'alimento_por_peso'].includes(form.categoria) && (
                  <>
                    <label style={s.lbl}>Edad</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      {EDADES.map(e => (
                        <button
                          key={e}
                          style={chipStyle(form.edad === e, `edad-${e}`)}
                          onFocus={(e) => {
                            e.currentTarget.style.outline = 'none'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                          onMouseEnter={() => setHoverChip(`edad-${e}`)}
                          onMouseLeave={() => setHoverChip(null)}
                          onClick={() =>
                            setForm(f => ({
                              ...f,
                              edad: f.edad === e ? '' : e
                            }))
                          }
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <label style={s.lbl}>
                  {form.categoria === 'farmacia'
                    ? 'Proveedor'
                    : form.categoria === 'cirugias_y_especialidades'
                      ? 'Laboratorio'
                      : 'Marca'}
                </label>

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    marginBottom: 4,
                  }}
                >
                  {(SUBCATEGORIAS[form.categoria] || []).map(sub => (
                    <button
                      key={sub.value}
                      style={chipStyle(form.subcategoria === sub.value, `subm-${sub.value}`)}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = 'none'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      onMouseEnter={() => setHoverChip(`subm-${sub.value}`)}
                      onMouseLeave={() => setHoverChip(null)}
                      onClick={() =>
                        setForm(f => ({
                          ...f,
                          subcategoria: f.subcategoria === sub.value ? '' : sub.value,
                        }))
                      }
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>



                <input
                  style={{
                    ...s.inp,
                    border: `1.5px solid ${ac.border}`, borderRadius: 6,
                  }}

                  value={
                    SUBCATEGORIAS[form.categoria]?.find(
                      s => s.value === form.subcategoria
                    )
                      ? ''
                      : form.subcategoria
                  }
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      subcategoria: e.target.value,
                    }))
                  }
                  placeholder="O escribí una nueva..."
                  autoComplete="off"
                />


              </>
            )}

            {form.categoria === 'farmacia' && (
              <>
                <label style={s.lbl}>Droga</label>
                <input
                  style={{
                    ...s.inp,
                    border: `1.5px solid ${ac.border}`, borderRadius: 6,
                  }}

                  value={form.droga}
                  onChange={e => setForm(f => ({ ...f, droga: e.target.value }))}
                  placeholder="Ej: Amoxicilina 500mg"
                />
              </>
            )}

            <label style={s.lbl}>Precio de costo</label>
            <input
              style={{
                ...s.inp,
                border: `1.5px solid ${ac.border}`, borderRadius: 6,
              }}

              type="number"
              min="0"
              step="0.01"
              value={form.precio_costo}
              onChange={e => {
                const costo = parseFloat(e.target.value) || 0
                const margen = parseFloat(form.margen) || 0
                setForm(f => ({
                  ...f,
                  precio_costo: e.target.value,
                  precio: margen > 0 ? (costo * (1 + margen / 100)).toFixed(2) : f.precio,
                }))
              }}
              placeholder="2000"
            />


            <label style={s.lbl}>Margen de ganancia (%)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                style={{ ...s.inp, flex: 1, borderRadius: 6, }}

                type="number"
                min="0"
                max="999"
                step="1"
                value={form.margen}
                onChange={e => {
                  const margen = parseFloat(e.target.value) || 0
                  const costo = parseFloat(form.precio_costo) || 0
                  setForm(f => ({
                    ...f,
                    margen: e.target.value,
                    precio: costo > 0 ? (costo * (1 + margen / 100)).toFixed(2) : f.precio,
                  }))
                }}
                placeholder="50"
              />
              {form.precio_costo && form.margen && (
                <span style={{
                  fontSize: 12, color: '#15803d', fontWeight: 600,
                  background: '#f0fdf4', padding: '4px 8px', borderRadius: 6,
                  border: '1px solid #e5e7eb', whiteSpace: 'nowrap',
                }}>
                  → ${(parseFloat(form.precio_costo) * (1 + parseFloat(form.margen) / 100))
                    .toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0' }}>
              El precio de venta se calcula automáticamente
            </p>

            <label style={s.lbl}>Nombre *</label>
            <input
              style={{
                ...s.inp,
                border: `1.5px solid ${ac.border}`,
              }}

              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Alimento Royal Canin 3kg"
            />

            {/* Imagen — solo en modo editar */}
            {modal !== 'nuevo' && (
              <div style={{ marginTop: 12 }}>
                <label style={s.lbl}>
                  Foto del producto
                </label>

                {modal.imagen_url ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <img
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${modal.imagen_url}`}
                      alt={modal.nombre}
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        objectFit: 'cover',
                        border: '1px solid #e5e7eb',
                      }}
                    />

                    <button
                      type="button"
                      style={{
                        ...s.btnEliminar,
                        fontSize: 11,
                      }}
                      onClick={() =>
                        handleEliminarImagen(modal.id)
                      }
                    >
                      🗑 Quitar foto
                    </button>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#9ca3af',
                      marginBottom: 6,
                    }}
                  >
                    Sin foto
                  </p>
                )}

                <label
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: 7,
                    border: '1px solid #d1fae5',
                    background: '#f0fdf4',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#15803d',
                    fontWeight: 600,
                  }}
                >
                  {subiendoImg
                    ? 'Subiendo...'
                    : '📷 Subir foto'}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}

                    onChange={e =>
                      handleSubirImagen(
                        e,
                        modal.id
                      )
                    }
                    disabled={subiendoImg}
                  />
                </label>
              </div>
            )}

            <label style={s.lbl}>Precio de venta *</label>
            <input
              style={{
                ...s.inp,
                border: `1.5px solid ${ac.border}`,
              }}

              type="number"
              min="0"
              step="0.01"
              value={form.precio}
              onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
              placeholder="5000"
            />

            {form.categoria === 'consultorio' && (
              <>
                <label style={s.lbl}>Precio en efectivo</label>

                <input
                  style={{
                    ...s.inp,
                    border: `1.5px solid ${ac.border}`,
                  }}

                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precio_efectivo}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      precio_efectivo: e.target.value
                    }))
                  }
                  placeholder="Ej: 4500"
                />
              </>
            )}

            {!esServicio(form.categoria) && (
              <>
                <label style={s.lbl}>Código de barras</label>
                <input
                  style={{
                    ...s.inp,
                    border: `1.5px solid ${ac.border}`,
                  }}

                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))}
                  placeholder="7891234560001 (opcional)"
                />
              </>
            )}

            {error && <p style={s.error}>{error}</p>}

            <div style={s.modalBtns}>
              <button
                style={{
                  ...s.btnCancelar,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                style={{
                  ...s.btnConfirmar,
                  background: ac.btn,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : modal === 'nuevo' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ── */}
      {confirmEl && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ ...s.modalTitulo, color: '#dc2626' }}>Eliminar producto</h3>
            <p style={{ fontSize: 16, color: '#374151', margin: '0 0 8px' }}>
              ¿Eliminar <strong>{confirmEl.nombre}</strong>?
            </p>
            <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 20px' }}>
              Si tiene ventas asociadas, se desactivará en lugar de eliminarse.
            </p>
            <div style={s.modalBtns}>
              <button style={s.btnCancelar} onClick={() => setConfirmEl(null)}>Cancelar</button>
              <button
                style={{ ...s.btnConfirmar, background: '#dc2626' }}
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
  pantalla: { minHeight: '100vh', background: '#f0fdf4', fontFamily: 'system-ui, sans-serif' },
  header: {
    background: '#15803d', color: 'white', padding: '12px 20px',
    display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100,
  },
  hbtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 7, padding: '5px 11px', cursor: 'pointer', fontSize: 12
  },
  htitulo: { fontSize: 16, fontWeight: 700, margin: 0, flex: 1 },
  btnNuevo: {
    background: 'white', color: '#15803d', border: 'none', borderRadius: 7,
    padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700
  },
  toast: { padding: '10px 20px', fontSize: 13, borderBottom: '1px solid rgba(0,0,0,0.06)' },
  body: { maxWidth: 1100, margin: '20px auto', padding: '0 16px' },
  filtroRow: { marginBottom: 16 },
  searchInput: {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb',
    fontSize: 16, outline: 'none', background: 'white', marginBottom: 10
  },
  catBtns: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  catBtn: {
    padding: '5px 12px',
    borderRadius: 20,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    fontSize: 12,
    color: '#374151',

    outline: 'none',
    boxShadow: 'none',
    transition: 'all 0.15s ease',
  },
  catBtnOn: { background: '#15803d', color: 'white', border: '1px solid #15803d', fontWeight: 600 },
  count: { fontSize: 12, color: '#6b7280' },
  msg: { textAlign: 'center', color: '#6b7280', padding: 30 },
  grupo: { marginBottom: 20 },
  grupoHeader: {
    fontSize: 13, fontWeight: 700, color: '#15803d', padding: '6px 2px',
    borderBottom: '2px solid #e5e7eb', marginBottom: 8
  },
  tableWrap: {
    background: 'white',
    borderRadius: 10,
    border: '0.5px solid #e5e7eb',
    overflow: 'hidden'
  },
  tabla: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontSize: 11, color: '#6b7280', textAlign: 'left', padding: '8px 12px',
    borderBottom: '1.5px solid #f0fdf4', fontWeight: 600, background: '#fafafa'
  },
  td: { padding: '9px 12px', borderBottom: '0.5px solid #f0fdf4', fontSize: 13, borderRadius: 5, },
  codigo: { fontFamily: 'monospace', fontSize: 11, color: '#6b7280' },
  precio: { fontWeight: 700, color: '#15803d' },
  servicioTag: {
    fontSize: 11, padding: '2px 7px', borderRadius: 5, fontStyle: 'italic',
    background: '#f3f4f6', color: '#6b7280'
  },
  servicioAviso: {
    fontSize: 12, color: '#854d0e', background: '#fefce8',
    border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', margin: '8px 0 0'
  },
  stockBadge: (v) => ({
    fontSize: 11, padding: '2px 7px', borderRadius: 5, fontWeight: 600,
    background: v === 0 ? '#fef2f2' : v <= 5 ? '#fff7ed' : '#f0fdf4',
    color: v === 0 ? '#dc2626' : v <= 5 ? '#d97706' : '#15803d',
  }),
  estadoBadge: (a) => ({
    fontSize: 11, padding: '2px 7px', borderRadius: 5,
    background: a !== false ? '#f0fdf4' : '#f3f4f6',
    color: a !== false ? '#15803d' : '#6b7280',
  }),
  btnEditar: {
    fontSize: 11, padding: '4px 9px', borderRadius: 5,
    border: '1px solid #d1fae5', background: 'white', cursor: 'pointer'
  },
  btnBaja: {
    fontSize: 11, padding: '4px 9px', borderRadius: 5,
    border: '1px solid #fde68a', background: '#fefce8',
    color: '#854d0e', cursor: 'pointer', fontWeight: 600
  },
  btnEliminar: {
    fontSize: 11, padding: '4px 9px', borderRadius: 5,
    border: '1px solid #fecaca', background: 'white',
    color: '#dc2626', cursor: 'pointer'
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
  },
  modal: {
    background: 'white', borderRadius: 14, padding: 26, width: 450,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto'
  },
  modalTitulo: { fontSize: 16, fontWeight: 700, color: '#15803d', margin: '0 0 16px' },
  lbl: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', margin: '10px 0 4px' },
  inp: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid #e5e7eb',
    outline: 'none',
    color: '#111',
    background: '#ffffff',
    fontSize: 16,
    transition: 'all 0.15s ease',
  },
  error: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  modalBtns: { display: 'flex', gap: 8, marginTop: 18 },
  btnCancelar: {
    flex: 1, padding: 10, borderRadius: 7, border: '1px solid #e5e7eb',
    background: 'white', cursor: 'pointer', fontSize: 13
  },
  btnConfirmar: {
    flex: 2, padding: 10, borderRadius: 7, border: 'none',
    background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700
  },
  loteRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 8, borderWidth: 1, borderStyle: 'solid', marginBottom: 8
  },
  badgeDanger: {
    fontSize: 10, padding: '1px 6px', borderRadius: 4,
    background: '#fef2f2', color: '#dc2626', fontWeight: 600
  },
  badgeWarn: {
    fontSize: 10, padding: '1px 6px', borderRadius: 4,
    background: '#fef9c3', color: '#854d0e', fontWeight: 600
  },
  btnDarBaja: {
    fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none',
    background: '#d97706', color: 'white', cursor: 'pointer', fontWeight: 600, flexShrink: 0
  },
  inpFocus: {
    border: '1.5px solid #16a34a',
    boxShadow: '0 0 0 3px rgba(22,163,74,0.15)',
  },
  hoverBtn: {
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  }

}