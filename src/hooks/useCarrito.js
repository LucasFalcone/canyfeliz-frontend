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

  // Ítem escrito a mano (nombre + precio libres, sin producto asociado)
  const agregarManual = useCallback(({ nombre, precio, cantidad = 1 }) => {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setItems(prev => [...prev, { id, manual: true, nombre, precio: Number(precio), cantidad: Number(cantidad) || 1 }])
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

  return { items, total, agregar, agregarManual, cambiarCantidad, eliminar, vaciar }
}