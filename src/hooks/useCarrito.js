import { useState, useCallback } from 'react'

export function useCarrito() {
  const [items, setItems] = useState([])

  const agregar = useCallback((producto) => {
    setItems(prev => {
      const existe = prev.find(i => i.id === producto.id)
      if (existe) {
        // Si ya está en el carrito, suma cantidad
        return prev.map(i =>
          i.id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }, [])

  const cambiarCantidad = useCallback((id, cantidad) => {
    const n = parseInt(cantidad, 10)
    if (isNaN(n) || n < 1) return
    setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: n } : i))
  }, [])

  const eliminar = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const vaciar = useCallback(() => setItems([]), [])

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

  return { items, total, agregar, cambiarCantidad, eliminar, vaciar }
}