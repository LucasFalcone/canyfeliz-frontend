import axios from 'axios'

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001'

console.log('VITE_API_URL =', import.meta.env.VITE_API_URL)
console.log('BASE_URL =', BASE_URL)


const client = axios.create({
  baseURL: BASE_URL,
})


client.interceptors.request.use(config => {
  const token = localStorage.getItem('cf_token') 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})


export const buscarProductos = (q, categoria, subcategoria, etiqueta) =>
  client.get('/productos', { params: { q, categoria, subcategoria, etiqueta } }).then(r => r.data)

export const crearVenta = (payload) =>
  client.post('/ventas', payload).then(r => r.data)

export const obtenerVentas = () =>
  client.get('/ventas').then(r => r.data)

export const getStock   = ()         => client.get('/stock').then(r => r.data)
export const getLotes   = (id)       => client.get(`/stock/${id}/lotes`).then(r => r.data)
export const agregarLote = (id, data) => client.post(`/stock/${id}/lotes`, data).then(r => r.data)
export const getAlertas = (dias = 30) => client.get('/stock/alertas', { params: { dias } }).then(r => r.data)
export const listarProductos    = ()       => client.get('/productos/todos').then(r => r.data)
export const crearProducto      = (data)   => client.post('/productos', data).then(r => r.data)
export const actualizarProducto = (id, data) => client.put(`/productos/${id}`, data).then(r => r.data)
export const eliminarProducto   = (id)     => client.delete(`/productos/${id}`).then(r => r.data)
export const getReportes = (desde, hasta) =>
  client.get('/reportes/resumen', { params: { desde, hasta } }).then(r => r.data)

export const darBajaLote = (productoId, loteId, motivo) =>
  client.post(`/stock/${productoId}/lotes/${loteId}/baja`, { motivo }).then(r => r.data)
export const emitirFactura  = (data) => client.post('/facturas', data).then(r => r.data)
export const listarFacturas = ()     => client.get('/facturas').then(r => r.data)
export const getFactura     = (id)   => client.get(`/facturas/${id}`).then(r => r.data)    

export const buscarClientes = (q) =>
  client.get('/clientes', { params: { q } }).then(r => r.data)

export const getCliente = (id) =>
  client.get(`/clientes/${id}`).then(r => r.data)

export const crearCliente = (data) =>
  client.post('/clientes', data).then(r => r.data)

export const actualizarCliente = (id, data) =>
  client.put(`/clientes/${id}`, data).then(r => r.data)

export const eliminarCliente = (id) =>
  client.delete(`/clientes/${id}`).then(r => r.data)

export const listarPromociones  = ()       => client.get('/promociones').then(r => r.data)
export const crearPromocion     = (data)   => client.post('/promociones', data).then(r => r.data)
export const actualizarPromocion = (id, data) => client.put(`/promociones/${id}`, data).then(r => r.data)
export const eliminarPromocion  = (id)     => client.delete(`/promociones/${id}`).then(r => r.data)

export const subirImagen = (id, file) => {
  const formData = new FormData()
  formData.append('imagen', file)
  return client.post(`/productos/${id}/imagen`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}
export const eliminarImagen = (id) =>
  client.delete(`/productos/${id}/imagen`).then(r => r.data)

export const emitirNotaCredito  = (data) => client.post('/notas-credito', data).then(r => r.data)
export const listarNotasCredito = ()     => client.get('/notas-credito').then(r => r.data)

export const getFaltantes          = ()          => client.get('/stock/faltantes').then(r => r.data)
export const actualizarStockMinimo = (id, monto) => client.put(`/stock/${id}/stock-minimo`, { stock_minimo: monto }).then(r => r.data)