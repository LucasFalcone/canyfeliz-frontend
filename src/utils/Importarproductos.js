// Utilidades puras para importar / actualizar productos desde planillas.
// (Sin React ni red: se pueden probar por separado.)

export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const claveProducto = (p) => `${p.categoria}|${norm(p.nombre)}`

export const redondearPrecio = (valor, paso = 50) =>
  valor ? Math.round(valor / paso) * paso : valor

// "$ 1.234,50" | "1234.5" | "6.000" | "45%" -> número (o null)
export function parsearNumero(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let t = String(v).replace(/[$%\s]/g, '')
  if (!t) return null
  const tienePunto = t.includes('.')
  const tieneComa = t.includes(',')
  if (tienePunto && tieneComa) {
    // el último separador es el decimal
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.')
    else t = t.replace(/,/g, '')
  } else if (tieneComa) {
    t = t.replace(',', '.')
  } else if (tienePunto && /^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '') // 6.000 -> 6000
  }
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

// CSV simple (comillas, separador , ; o tab, BOM)
export function parsearCSV(texto) {
  const t = String(texto).replace(/^﻿/, '')
  const primera = t.split(/\r?\n/, 1)[0] || ''
  const sep = [';', '\t', ','].reduce(
    (best, c) => (primera.split(c).length > primera.split(best).length ? c : best),
    ','
  )
  const filas = []
  let fila = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === sep) { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      fila.push(campo); campo = ''
      if (fila.some((x) => x.trim() !== '')) filas.push(fila)
      fila = []
    } else campo += c
  }
  fila.push(campo)
  if (fila.some((x) => x.trim() !== '')) filas.push(fila)
  return filas
}

const COLUMNAS = {
  nombre: ['nombre', 'producto', 'descripcion', 'articulo', 'detalle'],
  precio_costo: ['costo', 'precio costo', 'precio_costo', 'costo nuevo', 'nuevo costo'],
  precio: ['precio', 'precio final', 'p.final', 'precio venta', 'precio de venta', 'precio nuevo'],
  margen: ['margen', '% ganancia', 'margen %', 'ganancia'],
  categoria: ['categoria'],
  codigo: ['codigo', 'codigo de barras', 'cod'],
}

// CSV (exportado de Google Sheets) -> entradas {nombre, precio_costo?, precio?, margen?, categoria?, codigo?}
export function entradasDesdeCSV(texto) {
  const filas = parsearCSV(texto)
  if (filas.length < 2) return { entradas: [], error: 'El archivo está vacío.' }
  const cab = filas[0].map(norm)
  const idx = {}
  for (const [campo, alias] of Object.entries(COLUMNAS)) {
    const i = cab.findIndex((h) => alias.includes(h))
    if (i >= 0) idx[campo] = i
  }
  if (idx.nombre === undefined) {
    return { entradas: [], error: 'No encontré una columna "nombre" en la primera fila.' }
  }
  if (idx.precio_costo === undefined && idx.precio === undefined) {
    return { entradas: [], error: 'Falta una columna "costo" o "precio".' }
  }
  const entradas = []
  for (const f of filas.slice(1)) {
    const nombre = (f[idx.nombre] || '').trim()
    if (!nombre) continue
    const e = { nombre }
    if (idx.precio_costo !== undefined) e.precio_costo = parsearNumero(f[idx.precio_costo])
    if (idx.precio !== undefined) e.precio = parsearNumero(f[idx.precio])
    if (idx.margen !== undefined) e.margen = parsearNumero(f[idx.margen])
    if (idx.categoria !== undefined && f[idx.categoria]) e.categoria = norm(f[idx.categoria]).replace(/ /g, '_')
    if (idx.codigo !== undefined && f[idx.codigo]) e.codigo = f[idx.codigo].trim()
    if (e.precio_costo == null && e.precio == null) continue
    entradas.push(e)
  }
  return { entradas, error: null }
}

const igual = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.005

// Cruza las entradas con los productos existentes y decide qué crear / actualizar.
export function planificar(existentes, entradas) {
  const porClave = new Map()
  const porNombre = new Map()
  const porCodigo = new Map()
  for (const p of existentes) {
    porClave.set(claveProducto(p), p)
    const n = norm(p.nombre)
    porNombre.set(n, [...(porNombre.get(n) || []), p])
    if (p.codigo) porCodigo.set(String(p.codigo).trim(), p)
  }

  const plan = { nuevos: [], actualizar: [], sinCambios: 0, noEncontrados: [], ambiguos: [], sinMargen: [] }

  for (const e of entradas) {
    let p = null
    if (e.codigo && porCodigo.has(String(e.codigo).trim())) p = porCodigo.get(String(e.codigo).trim())
    else if (e.categoria) p = porClave.get(claveProducto(e)) || null
    else {
      const cand = porNombre.get(norm(e.nombre)) || []
      if (cand.length > 1) { plan.ambiguos.push(e); continue }
      p = cand[0] || null
    }

    if (!p) {
      if (e.categoria && e.precio != null) plan.nuevos.push(e)
      else plan.noEncontrados.push(e)
      continue
    }

    const costo = e.precio_costo != null ? e.precio_costo : Number(p.precio_costo) || 0
    let margen = e.margen != null ? e.margen : Number(p.margen) || 0
    let precio

    if (e.precio != null) {
      precio = e.precio
      if (e.margen == null && costo > 0) margen = Math.round((precio / costo - 1) * 1000) / 10
    } else if (margen > 0) {
      precio = redondearPrecio(costo * (1 + margen / 100))
    } else {
      plan.sinMargen.push(e)
      continue
    }

    const nuevo = {
      precio,
      precio_costo: costo,
      margen,
      precio_efectivo: e.precio_efectivo ?? null,
    }
    const cambia =
      !igual(p.precio, nuevo.precio) ||
      !igual(p.precio_costo, nuevo.precio_costo) ||
      !igual(p.margen, nuevo.margen) ||
      (nuevo.precio_efectivo != null && !igual(p.precio_efectivo, nuevo.precio_efectivo))

    if (cambia) plan.actualizar.push({ p, nuevo })
    else plan.sinCambios++
  }
  return plan
}

// Mismo formato que arma el ABM al guardar un producto
export function payloadActualizacion(p, nuevo) {
  return {
    nombre: p.nombre,
    precio: Number(nuevo.precio),
    codigo: p.codigo || null,
    categoria: p.categoria,
    precio_costo: Number(nuevo.precio_costo) || 0,
    margen: Number(nuevo.margen) || 0,
    subcategoria: p.subcategoria || null,
    etiqueta: p.etiqueta || null,
    droga: p.droga || null,
    precio_efectivo:
      nuevo.precio_efectivo != null ? Number(nuevo.precio_efectivo) : parseFloat(p.precio_efectivo) || null,
    edad: p.edad || null,
    mordida: p.mordida || null,
  }
}