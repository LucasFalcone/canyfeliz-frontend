import { useState, useCallback } from 'react'

export function useDescuento() {
  const [descuento,    setDescuento]    = useState(0)       // monto en $
  const [promocion,    setPromocion]    = useState(null)    // promo aplicada
  const [codigoManual, setCodigoManual] = useState('')      // input del cajero
  const [cupon, setCupon] = useState({ codigo: '', monto: 0, aplicado: false })


  // Aplicar promoción automática por categoría
  const aplicarPromocionCategoria = useCallback((items, promociones) => {
    for (const promo of promociones) {
      if (promo.tipo !== 'categoria') continue
      const subtotalCategoria = items
        .filter(i => i.categoria === promo.categoria)
        .reduce((a, i) => a + i.precio * i.cantidad, 0)

      if (subtotalCategoria > 0) {
        const monto = (subtotalCategoria * promo.valor) / 100
        setDescuento(Math.round(monto * 100) / 100)
        setPromocion(promo)
        return true
      }
    }
    return false
  }, [])

  const aplicarCupon = useCallback((codigo, monto) => {
  const m = parseFloat(monto) || 0
  if (m <= 0) return false
  setCupon({ codigo: codigo || 'MANUAL', monto: m, aplicado: true })
  return true
}, [])

const quitarCupon = useCallback(() => {
  setCupon({ codigo: '', monto: 0, aplicado: false })
}, [])

  // Aplicar 2x1
  const aplicar2x1 = useCallback((items, promo) => {
    if (!promo.producto_id) return false
    const item = items.find(i => i.id === promo.producto_id)
    if (!item || item.cantidad < 2) return false

    const gratis = Math.floor(item.cantidad / 2)
    const monto  = gratis * item.precio
    setDescuento(Math.round(monto * 100) / 100)
    setPromocion(promo)
    return true
  }, [])

  // Aplicar promo manual (elegida por el cajero)
  const aplicarPromocion = useCallback((promo, items, subtotal) => {
    if (!promo) { setDescuento(0); setPromocion(null); return }

    if (promo.tipo === 'porcentaje') {
      setDescuento(Math.round(subtotal * promo.valor / 100 * 100) / 100)
      setPromocion(promo)
    } else if (promo.tipo === 'monto_fijo') {
      setDescuento(Math.min(Number(promo.valor), subtotal))
      setPromocion(promo)
    } else if (promo.tipo === '2x1') {
      aplicar2x1(items, promo)
    } else if (promo.tipo === 'categoria') {
      aplicarPromocionCategoria(items, [promo])
    }
  }, [aplicar2x1, aplicarPromocionCategoria])

  // Descuento manual por porcentaje (input libre del cajero)
  const aplicarDescuentoManual = useCallback((porcentaje, subtotal) => {
    const pct = Math.min(Math.max(0, parseFloat(porcentaje) || 0), 100)
    setDescuento(Math.round(subtotal * pct / 100 * 100) / 100)
    setPromocion(null)
  }, [])

  const limpiar = useCallback(() => {
  setDescuento(0)
  setPromocion(null)
  setCodigoManual('')
  setCupon({ codigo: '', monto: 0, aplicado: false })
}, [])


  return {
    descuento,
    promocion,
    codigoManual,
    setCodigoManual,
    aplicarPromocion,
    aplicarDescuentoManual,
    limpiar,
    cupon, 
    aplicarCupon, 
    quitarCupon,
  }
}