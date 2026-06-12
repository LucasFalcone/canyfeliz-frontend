export default function ItemCarrito({
  item,
  onCambiarCantidad,
  onEliminar,
  accent = {},
}) {
  const ac = {
    border: accent.border || '#d1fae5',
    badge: accent.badge || '#f0fdf4',
    badgeText: accent.badgeText || '#15803d',
  }

  return (
    <div style={styles.fila}>
      <div style={styles.nombre}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {item.nombre}
        </span>

        <span style={styles.precioUnit}>
          ${Number(item.precio).toLocaleString('es-AR')} c/u

          {item.es_servicio && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                color: '#9ca3af',
              }}
            >
              servicio
            </span>
          )}
        </span>
      </div>

      <div style={styles.controles}>
        <button
          style={{
            ...styles.btnCantidad,
            border: `1px solid ${ac.border}`,
            background: ac.badge,
            color: ac.badgeText,
          }}
          onClick={() => onCambiarCantidad(item.id, item.cantidad - 1)}
          disabled={item.cantidad <= 1}
        >
          −
        </button>

        <input
          type="number"
          min="1"
          value={item.cantidad}
          onChange={e => onCambiarCantidad(item.id, e.target.value)}
          style={{
            ...styles.inputCantidad,
            border: `1px solid ${ac.border}`,
          }}
        />

        <button
          style={{
            ...styles.btnCantidad,
            border: `1px solid ${ac.border}`,
            background: ac.badge,
            color: ac.badgeText,
          }}
          onClick={() => onCambiarCantidad(item.id, item.cantidad + 1)}
        >
          +
        </button>
      </div>

      <span
        style={{
          ...styles.subtotal,
          color: ac.badgeText,
        }}
      >
        ${(item.precio * item.cantidad).toLocaleString('es-AR')}
      </span>

      <button
        style={styles.btnEliminar}
        onClick={() => onEliminar(item.id)}
      >
        ✕
      </button>
    </div>
  )
}

const styles = {
  fila: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #f0fdf4',
  },

  nombre: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },

  precioUnit: {
    fontSize: 12,
    color: '#6b7280',
  },

  controles: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },

  btnCantidad: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: '#f0fdf4',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputCantidad: {
    width: 44,
    textAlign: 'center',
    borderRadius: 6,
    padding: '4px 0',
    fontSize: 14,
  },

  subtotal: {
    fontWeight: 700,
    minWidth: 80,
    textAlign: 'right',
    fontSize: 15,
  },

  btnEliminar: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: 14,
    padding: '0 4px',
  },
}