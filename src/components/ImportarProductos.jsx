import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { listarProductos, crearProducto, agregarLote } from '../api/api'

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const clave = (p) => `${p.categoria}|${norm(p.nombre)}`

const CONCURRENCIA = 4

export default function ImportarProductos({ onCerrar, onTerminado, accent = {} }) {
  const { usuario } = useAuth()
  const ac = {
    primary: accent.btn || accent.primary || '#16a34a',
    dark: accent.badgeText || '#15803d',
    light: accent.light || '#f0fdf4',
    border: accent.border || '#d1fae5',
  }

  const inputRef = useRef(null)
  const [hoverBtn, setHoverBtn] = useState(null)
  const [paso, setPaso] = useState('elegir') // elegir | preview | importando | listo
  const [error, setError] = useState(null)
  const [nuevos, setNuevos] = useState([])
  const [omitidos, setOmitidos] = useState(0)
  const [hechos, setHechos] = useState(0)
  const [fallidos, setFallidos] = useState([])
  const [creados, setCreados] = useState(0)

  const hover = (id, base) => ({
    ...base,
    transition: 'all 0.15s ease',
    transform: hoverBtn === id ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hoverBtn === id ? '0 3px 10px rgba(0,0,0,0.12)' : 'none',
  })

  const leerArchivo = async (file) => {
    setError(null)
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data?.productos)) throw new Error('Formato inválido')

      if (data.veterinaria && data.veterinaria !== usuario?.veterinaria) {
        setError(
          `Este archivo es de ${data.veterinaria.toUpperCase()} y estás logueado en ${String(usuario?.veterinaria).toUpperCase()}. Entrá con el usuario de la veterinaria correcta.`
        )
        return
      }

      const existentes = new Set((await listarProductos()).map(clave))
      const aCrear = data.productos.filter((p) => !existentes.has(clave(p)))
      setNuevos(aCrear)
      setOmitidos(data.productos.length - aCrear.length)
      setPaso('preview')
    } catch (e) {
      setError(e?.message === 'Formato inválido' ? 'El archivo no tiene el formato esperado.' : 'No se pudo leer el archivo.')
    }
  }

  const importar = async () => {
    setPaso('importando')
    setHechos(0)
    setCreados(0)
    setFallidos([])

    let i = 0
    const errores = []
    let ok = 0

    const worker = async () => {
      while (i < nuevos.length) {
        const p = nuevos[i++]
        const { stock, ...payload } = p
        try {
          const nuevo = await crearProducto(payload)
          if (stock > 0 && nuevo?.id) {
            await agregarLote(nuevo.id, { cantidad: Number(stock), fecha_venc: null })
          }
          ok++
        } catch (e) {
          errores.push(`${p.nombre}: ${e?.response?.data?.error || e.message || 'error'}`)
        }
        setHechos((h) => h + 1)
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCIA }, worker))
    setCreados(ok)
    setFallidos(errores)
    setPaso('listo')
    onTerminado?.()
  }

  const conStock = nuevos.filter((p) => p.stock > 0).length
  const unidades = nuevos.reduce((a, p) => a + (p.stock || 0), 0)
  const pct = nuevos.length ? Math.round((hechos / nuevos.length) * 100) : 0

  const btnPrimario = {
    flex: 2, padding: 11, borderRadius: 8, border: 'none',
    background: ac.primary, color: 'white', cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
  }
  const btnSecundario = {
    flex: 1, padding: 11, borderRadius: 8, border: `1px solid ${ac.border}`,
    background: 'white', cursor: 'pointer', fontSize: 14,
  }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 15, padding: 26, width: 460, maxWidth: '92vw',
        maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: ac.dark }}>
          📥 Importar productos
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
          Veterinaria actual: <strong>{String(usuario?.veterinaria || '').toUpperCase()}</strong>
        </p>

        {error && (
          <div style={{
            background: '#fef2f2', color: '#dc2626', borderRadius: 8,
            padding: '9px 12px', fontSize: 13, marginBottom: 14,
          }}>
            {error}
          </div>
        )}

        {paso === 'elegir' && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])}
            />
            <button
              style={hover('elegir', { ...btnPrimario, width: '100%', flex: 'none' })}
              onMouseEnter={() => setHoverBtn('elegir')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={() => inputRef.current?.click()}
            >
              Elegir archivo .json
            </button>
            <button
              style={hover('cancelar', { ...btnSecundario, width: '100%', flex: 'none', marginTop: 9 })}
              onMouseEnter={() => setHoverBtn('cancelar')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={onCerrar}
            >
              Cancelar
            </button>
          </>
        )}

        {paso === 'preview' && (
          <>
            <div style={{
              background: ac.light, border: `1px solid ${ac.border}`,
              borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.7,
            }}>
              <div>🆕 Se van a crear: <strong>{nuevos.length}</strong> productos</div>
              <div>📦 Con stock inicial: <strong>{conStock}</strong> ({unidades.toLocaleString('es-AR')} unidades)</div>
              <div>⏭️ Ya existen (se omiten): <strong>{omitidos}</strong></div>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '10px 0 0' }}>
              El stock se carga como un lote sin vencimiento por producto.
            </p>
            <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
              <button
                style={hover('volver', btnSecundario)}
                onMouseEnter={() => setHoverBtn('volver')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => { setPaso('elegir'); setNuevos([]) }}
              >
                Atrás
              </button>
              <button
                style={hover('importar', { ...btnPrimario, opacity: nuevos.length ? 1 : 0.5 })}
                onMouseEnter={() => setHoverBtn('importar')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={importar}
                disabled={!nuevos.length}
              >
                Importar {nuevos.length} productos
              </button>
            </div>
          </>
        )}

        {paso === 'importando' && (
          <>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              Importando… {hechos} / {nuevos.length}
            </div>
            <div style={{ height: 10, background: '#e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: ac.primary, transition: 'width 0.2s' }} />
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
              No cierres esta ventana hasta que termine.
            </p>
          </>
        )}

        {paso === 'listo' && (
          <>
            <div style={{
              background: ac.light, border: `1px solid ${ac.border}`,
              borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.7,
            }}>
              <div>✅ Creados: <strong>{creados}</strong></div>
              {fallidos.length > 0 && <div style={{ color: '#dc2626' }}>⚠️ Con error: <strong>{fallidos.length}</strong></div>}
            </div>
            {fallidos.length > 0 && (
              <div style={{
                marginTop: 10, maxHeight: 160, overflowY: 'auto', fontSize: 12,
                color: '#dc2626', background: '#fef2f2', borderRadius: 8, padding: '8px 10px',
              }}>
                {fallidos.map((f, k) => <div key={k}>{f}</div>)}
              </div>
            )}
            <button
              style={hover('cerrar', { ...btnPrimario, width: '100%', flex: 'none', marginTop: 16 })}
              onMouseEnter={() => setHoverBtn('cerrar')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={onCerrar}
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}