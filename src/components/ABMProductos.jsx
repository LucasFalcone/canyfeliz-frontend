import { useState, useEffect, useRef } from 'react'
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

// Redondea un precio al múltiplo más cercano de "paso" (por defecto 50)
// Ej: 132 -> 150 | 118 -> 100 | 175 -> 200
function redondearPrecio(valor, paso = 50) {
  if (!valor || isNaN(valor)) return valor
  return Math.round(valor / paso) * paso
}

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

// Si imagen_url ya es una URL completa (Supabase Storage, http/https),
// se usa tal cual. Si es una ruta relativa vieja (ej: "/uploads/xxx.jpg"),
// se arma con VITE_API_URL como antes.
function resolverImagenUrl(url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${url}`
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
  const [imgPreview, setImgPreview] = useState(null)

  const [fotoNuevaFile, setFotoNuevaFile] = useState(null)
  const [fotoNuevaPreview, setFotoNuevaPreview] = useState(null)

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
    fontSize: 13,

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
    setFotoNuevaFile(null)
    setFotoNuevaPreview(null)
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

  const quitarFotoNueva = () => {
    if (fotoNuevaPreview) URL.revokeObjectURL(fotoNuevaPreview)
    setFotoNuevaFile(null)
    setFotoNuevaPreview(null)
  }

  const cerrarModal = () => {
    quitarFotoNueva()
    setModal(null)
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
        const nuevo = await crearProducto(payload)

        if (fotoNuevaFile && nuevo?.id) {
          await subirArchivo(fotoNuevaFile, nuevo.id)
        }

        mostrarToast('Producto creado correctamente')
      } else {
        await actualizarProducto(modal.id, payload)
        mostrarToast('Producto actualizado')
      }

      setModal(null)
      if (fotoNuevaPreview) URL.revokeObjectURL(fotoNuevaPreview)
      setFotoNuevaFile(null)
      setFotoNuevaPreview(null)
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

  const subirArchivo = async (file, productoId) => {
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

  // --- Editor de foto: recorte + zoom + arrastre ---
  const FRAME = 280   // tamaño visible del recuadro de recorte (px)
  const SALIDA = 600  // tamaño de la imagen final que se sube (px, cuadrada)

  const [recorte, setRecorte] = useState(null)
  const dragRef = useRef(null)

  const abrirEditor = (url, productoId, esUrlExterna = false) => {
    const img = new Image()
    if (esUrlExterna) img.crossOrigin = 'anonymous'

    img.onload = () => {
      const baseScale = FRAME / Math.min(img.naturalWidth, img.naturalHeight)

      setRecorte({
        productoId,
        url,
        esUrlExterna,
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        baseScale,
        zoom: 1,
        offsetX: (FRAME - img.naturalWidth * baseScale) / 2,
        offsetY: (FRAME - img.naturalHeight * baseScale) / 2,
      })
    }

    img.onerror = () => {
      mostrarToast('No se pudo cargar la imagen para editarla', 'error')
    }

    img.src = url
  }

  const handleSubirImagen = (e, productoId) => {
    const file = e.target.files[0]
    e.target.value = ''

    if (!file) return

    abrirEditor(URL.createObjectURL(file), productoId, false)
  }

  const handleEditarFoto = (imagenUrl, productoId) => {
    abrirEditor(resolverImagenUrl(imagenUrl), productoId, true)
  }

  const clampOffset = (r, scale) => {
    const w = r.naturalW * scale
    const h = r.naturalH * scale

    const minX = Math.min(0, FRAME - w)
    const minY = Math.min(0, FRAME - h)

    return {
      offsetX: Math.min(0, Math.max(minX, r.offsetX)),
      offsetY: Math.min(0, Math.max(minY, r.offsetY)),
    }
  }

  const cambiarZoom = (zoom) => {
    setRecorte(prev => {
      if (!prev) return prev

      const oldScale = prev.baseScale * prev.zoom
      const newScale = prev.baseScale * zoom

      // Punto de la imagen que está en el centro del recuadro (FRAME/2)
      const centerImgX = (FRAME / 2 - prev.offsetX) / oldScale
      const centerImgY = (FRAME / 2 - prev.offsetY) / oldScale

      // Recalculamos el offset para que ese mismo punto siga en el centro
      const nextOffset = {
        offsetX: FRAME / 2 - centerImgX * newScale,
        offsetY: FRAME / 2 - centerImgY * newScale,
      }

      const clamped = clampOffset({ ...prev, ...nextOffset }, newScale)
      return { ...prev, zoom, ...clamped }
    })
  }

  const onPointerDownImg = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: recorte.offsetX,
      offsetY: recorte.offsetY,
    }
  }

  const onPointerMoveImg = (e) => {
    if (!dragRef.current) return

    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY

    setRecorte(prev => {
      if (!prev) return prev
      const scale = prev.baseScale * prev.zoom
      const clamped = clampOffset(
        {
          ...prev,
          offsetX: dragRef.current.offsetX + dx,
          offsetY: dragRef.current.offsetY + dy,
        },
        scale
      )
      return { ...prev, ...clamped }
    })
  }

  const onPointerUpImg = () => {
    dragRef.current = null
  }

  const cancelarRecorte = () => {
    if (recorte?.url && !recorte.esUrlExterna) URL.revokeObjectURL(recorte.url)
    setRecorte(null)
  }

  const confirmarRecorte = async () => {
    const r = recorte
    if (!r) return

    const scale = r.baseScale * r.zoom

    const canvas = document.createElement('canvas')
    canvas.width = SALIDA
    canvas.height = SALIDA
    const ctx = canvas.getContext('2d')

    const img = new Image()
    if (r.esUrlExterna) img.crossOrigin = 'anonymous'
    img.src = r.url

    await new Promise(resolve => {
      if (img.complete) return resolve()
      img.onload = resolve
    })

    const sx = -r.offsetX / scale
    const sy = -r.offsetY / scale
    const sSize = FRAME / scale

    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, SALIDA, SALIDA)

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' })
      if (!r.esUrlExterna) URL.revokeObjectURL(r.url)
      setRecorte(null)

      if (r.productoId === 'nuevo') {
        if (fotoNuevaPreview) URL.revokeObjectURL(fotoNuevaPreview)
        setFotoNuevaFile(file)
        setFotoNuevaPreview(URL.createObjectURL(file))
      } else {
        await subirArchivo(file, r.productoId)
      }
    }, 'image/jpeg', 0.9)
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
                style={{ ...s.catBtn, fontSize: 13, ...(subFiltro === '' ? catBtnOnStyle : {}) }}
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
                style={{ ...s.catBtn, fontSize: 13, ...(etiquetaFiltro === '' ? catBtnOnStyle : {}) }}
                onClick={() => setEtiquetaFiltro('')}
              >
                Todas
              </button>
              {etiquetasDisponibles.map(e => (
                <button
                  key={e}
                  style={{ ...s.catBtn, fontSize: 13, ...(etiquetaFiltro === e ? catBtnOnStyle : {}) }}
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
                        src={resolverImagenUrl(p.imagen_url)}
                        alt={p.nombre}
                        onClick={(e) => {
                          e.stopPropagation()
                          setImgPreview(resolverImagenUrl(p.imagen_url))
                        }}
                        style={{
                          width: 66,
                          height: 66,
                          borderRadius: 8,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 66,
                          height: 66,
                          borderRadius: 8,
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
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
                            maximumFractionDigits: 0,
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
                              fontSize: 13,
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
                              src={resolverImagenUrl(p.imagen_url)}
                              alt={p.nombre}
                              onClick={(e) => {
                                e.stopPropagation()
                                setImgPreview(resolverImagenUrl(p.imagen_url))
                              }}
                              style={{
                                width: 53,
                                height: 53,
                                borderRadius: 6,
                                objectFit: 'cover',
                                border: '1px solid #e5e7eb',
                                cursor: 'pointer',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 53,
                                height: 53,
                                borderRadius: 6,
                                background: '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20,
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
                                fontSize: 13,
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
                                  fontSize: 13,
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
                                fontSize: 13,
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
                            <span style={{ fontSize: 13, color: '#6b7280' }}>
                              $
                              {Number(p.precio_costo).toLocaleString('es-AR', {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {p.margen > 0 ? (
                            <span style={{ fontSize: 13, color: '#6b7280' }}>
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
                              maximumFractionDigits: 0,
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
                                  maximumFractionDigits: 0,
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
                  precio: margen > 0 ? redondearPrecio(costo * (1 + margen / 100)).toFixed(2) : f.precio,
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
                    precio: costo > 0 ? redondearPrecio(costo * (1 + margen / 100)).toFixed(2) : f.precio,
                  }))
                }}
                placeholder="50"
              />
              {form.precio_costo && form.margen && (
                <span style={{
                  fontSize: 13, color: '#15803d', fontWeight: 600,
                  background: '#f0fdf4', padding: '4px 8px', borderRadius: 6,
                  border: '1px solid #e5e7eb', whiteSpace: 'nowrap',
                }}>
                  → ${redondearPrecio(parseFloat(form.precio_costo) * (1 + parseFloat(form.margen) / 100))
                    .toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '3px 0 0' }}>
              El precio de venta se calcula automáticamente y se redondea a múltiplos de $50
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

            {/* Imagen — modo nuevo y editar */}
            <div style={{ marginTop: 12 }}>
              <label style={s.lbl}>
                Foto del producto
              </label>

              {modal === 'nuevo' ? (
                fotoNuevaPreview ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <img
                      src={fotoNuevaPreview}
                      alt=""
                      onClick={() => setImgPreview(fotoNuevaPreview)}
                      style={{
                        width: 106,
                        height: 106,
                        borderRadius: 8,
                        objectFit: 'cover',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                      }}
                    />

                    <button
                      type="button"
                      style={{
                        fontSize: 13,
                        padding: '5px 11px',
                        borderRadius: 5,
                        border: `1px solid ${ac.border}`,
                        background: 'white',
                        color: ac.badgeText,
                        cursor: 'pointer',
                        ...btnHover('editar-foto-nueva'),
                      }}
                      onMouseEnter={() => setHoverBtn('editar-foto-nueva')}
                      onMouseLeave={() => setHoverBtn(null)}
                      onClick={() =>
                        abrirEditor(fotoNuevaPreview, 'nuevo', false)
                      }
                    >
                      ✏️ Editar
                    </button>

                    <button
                      type="button"
                      style={{
                        ...s.btnEliminar,
                        fontSize: 13,
                      }}
                      onClick={quitarFotoNueva}
                    >
                      🗑 Quitar foto
                    </button>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: '#9ca3af',
                      marginBottom: 6,
                    }}
                  >
                    Sin foto
                  </p>
                )
              ) : modal.imagen_url ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <img
                    src={resolverImagenUrl(modal.imagen_url)}
                    alt={modal.nombre}
                    onClick={() => setImgPreview(resolverImagenUrl(modal.imagen_url))}
                    style={{
                      width: 106,
                      height: 106,
                      borderRadius: 8,
                      objectFit: 'cover',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                    }}
                  />

                  <button
                    type="button"
                    style={{
                      fontSize: 13,
                      padding: '5px 11px',
                      borderRadius: 5,
                      border: `1px solid ${ac.border}`,
                      background: 'white',
                      color: ac.badgeText,
                      cursor: 'pointer',
                      ...btnHover('editar-foto'),
                    }}
                    onMouseEnter={() => setHoverBtn('editar-foto')}
                    onMouseLeave={() => setHoverBtn(null)}
                    onClick={() =>
                      handleEditarFoto(modal.imagen_url, modal.id)
                    }
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    style={{
                      ...s.btnEliminar,
                      fontSize: 13,
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
                    fontSize: 13,
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
                  fontSize: 13,
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
                      modal === 'nuevo' ? 'nuevo' : modal.id
                    )
                  }
                  disabled={subiendoImg}
                />
              </label>
            </div>

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
                onClick={cerrarModal}
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

      {/* ── Editor de foto: recorte + zoom ── */}
      {recorte && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, width: FRAME + 60, textAlign: 'center' }}>
            <h3 style={{ ...s.modalTitulo, margin: '0 0 15px' }}>
              Ajustar foto
            </h3>

            <div
              style={{
                width: FRAME,
                height: FRAME,
                margin: '0 auto',
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                background: '#f3f4f6',
                cursor: dragRef.current ? 'grabbing' : 'grab',
                touchAction: 'none',
                border: `1.5px solid ${ac.border}`,
              }}
              onPointerDown={onPointerDownImg}
              onPointerMove={onPointerMoveImg}
              onPointerUp={onPointerUpImg}
              onPointerLeave={onPointerUpImg}
            >
              <img
                src={recorte.url}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: recorte.offsetX,
                  top: recorte.offsetY,
                  width: recorte.naturalW * recorte.baseScale * recorte.zoom,
                  height: recorte.naturalH * recorte.baseScale * recorte.zoom,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <span style={{ fontSize: 16 }}>🔍</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={recorte.zoom}
                onChange={e => cambiarZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>

            <p style={{ fontSize: 12, color: '#9ca3af', margin: '8px 0 0' }}>
              Arrastrá la foto para reposicionarla
            </p>

            <div style={s.modalBtns}>
              <button
                style={{
                  ...s.btnCancelar,
                  ...btnHover('cancelar-recorte'),
                }}
                onMouseEnter={() => setHoverBtn('cancelar-recorte')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={cancelarRecorte}
              >
                Cancelar
              </button>
              <button
                style={{
                  ...s.btnConfirmar,
                  ...btnHover('usar-recorte'),
                }}
                onMouseEnter={() => setHoverBtn('usar-recorte')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={confirmarRecorte}
                disabled={subiendoImg}
              >
                {subiendoImg ? 'Subiendo...' : 'Usar esta foto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Zoom de foto ── */}
      {imgPreview && (
        <div
          style={s.overlayImg}
          onClick={() => setImgPreview(null)}
        >
          <img
            src={imgPreview}
            alt=""
            style={s.imgZoom}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            style={s.btnCerrarZoom}
            onClick={() => setImgPreview(null)}
          >
            ✕
          </button>
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
    background: '#15803d', color: 'white', padding: '13px 22px',
    display: 'flex', alignItems: 'center', gap: 18, position: 'sticky', top: 0, zIndex: 100,
  },
  hbtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: 'white', borderRadius: 9, padding: '8px 16px', cursor: 'pointer', fontSize: 15
  },
  htitulo: { fontSize: 22, fontWeight: 700, margin: 0, flex: 1 },
  btnNuevo: {
    background: 'white', color: '#15803d', border: 'none', borderRadius: 9,
    padding: '7px 15px', cursor: 'pointer', fontSize: 16, fontWeight: 700
  },
  toast: { padding: '13px 26px', fontSize: 15, borderBottom: '1px solid rgba(0,0,0,0.06)' },
  body: {
  maxWidth: 1450, 
  margin: '24px auto',
  padding: '0 10px'
},
  filtroRow: { marginBottom: 22 },
  searchInput: {
    width: '100%', padding: '12px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb',
    fontSize: 17, outline: 'none', background: 'white', marginBottom: 13
  },
  catBtns: { display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 11 },
  catBtn: {
    padding: '8px 18px',
    borderRadius: 20,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: 'pointer',
    fontSize: 14,
    color: '#374151',

    outline: 'none',
    boxShadow: 'none',
    transition: 'all 0.15s ease',
  },
  catBtnOn: { background: '#15803d', color: 'white', border: '1px solid #15803d', fontWeight: 600 },
  count: { fontSize: 14, color: '#6b7280' },
  msg: { textAlign: 'center', color: '#6b7280', padding: 44, fontSize: 15 },
  grupo: { marginBottom: 29 },
  grupoHeader: {
    fontSize: 15, fontWeight: 700, color: '#15803d', padding: '9px 3px',
    borderBottom: '2px solid #e5e7eb', marginBottom: 11
  },
  tableWrap: {
    background: 'white',
    borderRadius: 13,
    border: '0.5px solid #e5e7eb',
    overflow: 'hidden'
  },
  tabla: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontSize: 13, color: '#6b7280', textAlign: 'left', padding: '11px 15px',
    borderBottom: '1.5px solid #f0fdf4', fontWeight: 600, background: '#fafafa'
  },
  td: { padding: '12px 15px', borderBottom: '0.5px solid #f0fdf4', fontSize: 15, borderRadius: 5, },
  codigo: { fontFamily: 'monospace', fontSize: 13, color: '#6b7280' },
  precio: { fontWeight: 700, color: '#15803d' },
  servicioTag: {
    fontSize: 13, padding: '3px 9px', borderRadius: 5, fontStyle: 'italic',
    background: '#f3f4f6', color: '#6b7280'
  },
  servicioAviso: {
    fontSize: 14, color: '#854d0e', background: '#fefce8',
    border: '1px solid #fde68a', borderRadius: 7, padding: '9px 13px', margin: '9px 0 0'
  },
  stockBadge: (v) => ({
    fontSize: 13, padding: '3px 9px', borderRadius: 5, fontWeight: 600,
    background: v === 0 ? '#fef2f2' : v <= 5 ? '#fff7ed' : '#f0fdf4',
    color: v === 0 ? '#dc2626' : v <= 5 ? '#d97706' : '#15803d',
  }),
  estadoBadge: (a) => ({
    fontSize: 13, padding: '3px 9px', borderRadius: 5,
    background: a !== false ? '#f0fdf4' : '#f3f4f6',
    color: a !== false ? '#15803d' : '#6b7280',
  }),
  btnEditar: {
    fontSize: 13, padding: '6px 12px', borderRadius: 5,
    border: '1px solid #d1fae5', background: 'white', cursor: 'pointer'
  },
  btnBaja: {
    fontSize: 13, padding: '6px 12px', borderRadius: 5,
    border: '1px solid #fde68a', background: '#fefce8',
    color: '#854d0e', cursor: 'pointer', fontWeight: 600
  },
  btnEliminar: {
    fontSize: 13, padding: '6px 12px', borderRadius: 5,
    border: '1px solid #fecaca', background: 'white',
    color: '#dc2626', cursor: 'pointer'
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
  },
  modal: {
    background: 'white', borderRadius: 18, padding: 33, width: 550,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: '90vh', overflowY: 'auto'
  },
  modalTitulo: { fontSize: 20, fontWeight: 700, color: '#15803d', margin: '0 0 22px' },
  lbl: { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', margin: '13px 0 6px' },
  inp: {
    width: '100%',
    padding: '13px 15px',
    borderRadius: 10,
    border: '1.5px solid #e5e7eb',
    outline: 'none',
    color: '#111',
    background: '#ffffff',
    fontSize: 17,
    transition: 'all 0.15s ease',
  },
  error: { color: '#dc2626', fontSize: 15, marginTop: 9 },
  modalBtns: { display: 'flex', gap: 11, marginTop: 22 },
  btnCancelar: {
    flex: 1, padding: 13, borderRadius: 9, border: '1px solid #e5e7eb',
    background: 'white', cursor: 'pointer', fontSize: 15
  },
  btnConfirmar: {
    flex: 2, padding: 13, borderRadius: 9, border: 'none',
    background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 700
  },
  loteRow: {
    display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px',
    borderRadius: 9, borderWidth: 1, borderStyle: 'solid', marginBottom: 9
  },
  badgeDanger: {
    fontSize: 13, padding: '2px 8px', borderRadius: 4,
    background: '#fef2f2', color: '#dc2626', fontWeight: 600
  },
  badgeWarn: {
    fontSize: 13, padding: '2px 8px', borderRadius: 4,
    background: '#fef9c3', color: '#854d0e', fontWeight: 600
  },
  btnDarBaja: {
    fontSize: 13, padding: '7px 13px', borderRadius: 7, border: 'none',
    background: '#d97706', color: 'white', cursor: 'pointer', fontWeight: 600, flexShrink: 0
  },
  inpFocus: {
    border: '1.5px solid #16a34a',
    boxShadow: '0 0 0 3px rgba(22,163,74,0.15)',
  },
  hoverBtn: {
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  overlayImg: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1200, cursor: 'zoom-out',
  },
  imgZoom: {
    maxWidth: '90vw', maxHeight: '90vh', borderRadius: 11,
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)', cursor: 'default',
  },
  btnCerrarZoom: {
    position: 'fixed', top: 22, right: 26, width: 44, height: 44,
    borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.9)',
    color: '#111827', fontSize: 20, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },

}