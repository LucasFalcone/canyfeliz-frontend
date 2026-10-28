import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { listarProductos, crearProducto, actualizarProducto, agregarLote } from '../api/api'
import { entradasDesdeCSV, planificar, payloadActualizacion } from '../utils/importarProductos'

const CONCURRENCIA = 4
const $ = (n) => `$${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

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
  const [paso, setPaso] = useState('elegir') // elegir | preview | procesando | listo
  const [error, setError] = useState(null)
  const [plan, setPlan] = useState(null)
  const [hacerCrear, setHacerCrear] = useState(true)
  const [hacerActualizar, setHacerActualizar] = useState(true)
  const [total, setTotal] = useState(0)
  const [hechos, setHechos] = useState(0)
  const [fallidos, setFallidos] = useState([])
  const [resultado, setResultado] = useState({ creados: 0, actualizados: 0 })

  const hover = (id, base) => ({
    ...base,
    transition: 'all 0.15s ease',
    transform: hoverBtn === id ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: hoverBtn === id ? '0 3px 10px rgba(0,0,0,0.12)' : 'none',
  })

  const leerArchivo = async (file) => {
    setError(null)
    try {
      const texto = await file.text()
      let entradas

      if (/\.csv$/i.test(file.name)) {
        const r = entradasDesdeCSV(texto)
        if (r.error) return setError(r.error)
        entradas = r.entradas
      } else {
        const data = JSON.parse(texto)
        if (!Array.isArray(data?.productos)) throw new Error('formato')
        if (data.veterinaria && data.veterinaria !== usuario?.veterinaria) {
          return setError(
            `Este archivo es de ${data.veterinaria.toUpperCase()} y estás logueado en ${String(usuario?.veterinaria).toUpperCase()}. Entrá con el usuario de la veterinaria correcta.`
          )
        }
        entradas = data.productos
      }

      const existentes = await listarProductos()
      const p = planificar(existentes, entradas)
      setPlan(p)
      setHacerCrear(true)
      setHacerActualizar(true)
      setPaso('preview')
    } catch (e) {
      setError(e?.message === 'formato' ? 'El archivo no tiene el formato esperado.' : 'No se pudo leer el archivo.')
    }
  }

  const ejecutar = async () => {
    const tareas = []
    if (hacerCrear) plan.nuevos.forEach((p) => tareas.push({ tipo: 'crear', p }))
    if (hacerActualizar) plan.actualizar.forEach((a) => tareas.push({ tipo: 'actualizar', ...a }))

    setTotal(tareas.length)
    setHechos(0)
    setFallidos([])
    setPaso('procesando')

    let i = 0
    let creados = 0
    let actualizados = 0
    const errores = []

    const worker = async () => {
      while (i < tareas.length) {
        const t = tareas[i++]
        const nombre = t.p.nombre
        try {
          if (t.tipo === 'crear') {
            const { stock, ...payload } = t.p
            const nuevo = await crearProducto(payload)
            if (stock > 0 && nuevo?.id) {
              await agregarLote(nuevo.id, { cantidad: Number(stock), fecha_venc: null })
            }
            creados++
          } else {
            await actualizarProducto(t.p.id, payloadActualizacion(t.p, t.nuevo))
            actualizados++
          }
        } catch (e) {
          errores.push(`${nombre}: ${e?.response?.data?.error || e.message || 'error'}`)
        }
        setHechos((h) => h + 1)
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCIA }, worker))
    setResultado({ creados, actualizados })
    setFallidos(errores)
    setPaso('listo')
    onTerminado?.()
  }

  const pct = total ? Math.round((hechos / total) * 100) : 0
  const aHacer = (hacerCrear ? plan?.nuevos.length || 0 : 0) + (hacerActualizar ? plan?.actualizar.length || 0 : 0)

  const btnPrimario = {
    flex: 2, padding: 11, borderRadius: 8, border: 'none',
    background: ac.primary, color: 'white', cursor: 'pointer',
    fontSize: 14, fontWeight: 700,
  }
  const btnSecundario = {
    flex: 1, padding: 11, borderRadius: 8, border: `1px solid ${ac.border}`,
    background: 'white', cursor: 'pointer', fontSize: 14,
  }
  const caja = {
    background: ac.light, border: `1px solid ${ac.border}`,
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.7,
  }
  const aviso = {
    marginTop: 10, fontSize: 12, color: '#854d0e', background: '#fefce8',
    border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px',
  }
  const check = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 10, cursor: 'pointer' }

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 15, padding: 26, width: 480, maxWidth: '92vw',
        maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: ac.dark }}>
          📥 Importar / actualizar productos
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
            <div style={{ ...caja, fontSize: 13 }}>
              <div><strong>.json</strong> — carga inicial de productos (el que te armo yo desde la planilla).</div>
              <div style={{ marginTop: 4 }}>
                <strong>.csv</strong> — actualizar costos o precios. Columnas: <code>nombre</code> y <code>costo</code> (o <code>precio</code>);
                opcionales: <code>margen</code>, <code>categoria</code>, <code>codigo</code>.
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])}
            />
            <button
              style={hover('elegir', { ...btnPrimario, width: '100%', flex: 'none', marginTop: 14 })}
              onMouseEnter={() => setHoverBtn('elegir')}
              onMouseLeave={() => setHoverBtn(null)}
              onClick={() => inputRef.current?.click()}
            >
              Elegir archivo
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

        {paso === 'preview' && plan && (
          <>
            <div style={caja}>
              <div>🆕 Productos nuevos: <strong>{plan.nuevos.length}</strong></div>
              <div>✏️ Con precio o costo distinto: <strong>{plan.actualizar.length}</strong></div>
              <div>✔️ Sin cambios: <strong>{plan.sinCambios}</strong></div>
              {plan.noEncontrados.length > 0 && <div>❔ No encontrados: <strong>{plan.noEncontrados.length}</strong></div>}
            </div>

            {plan.actualizar.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Ejemplos de cambios</div>
                {plan.actualizar.slice(0, 6).map(({ p, nuevo }) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</span>
                    <span style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>
                      {$(p.precio)} → <strong style={{ color: ac.dark }}>{$(nuevo.precio)}</strong>
                    </span>
                  </div>
                ))}
                {plan.actualizar.length > 6 && (
                  <div style={{ color: '#9ca3af', marginTop: 4 }}>… y {plan.actualizar.length - 6} más</div>
                )}
              </div>
            )}

            {plan.nuevos.length > 0 && (
              <label style={check}>
                <input type="checkbox" checked={hacerCrear} onChange={(e) => setHacerCrear(e.target.checked)} />
                Crear los {plan.nuevos.length} productos nuevos (el stock entra como un lote sin vencimiento)
              </label>
            )}
            {plan.actualizar.length > 0 && (
              <label style={check}>
                <input type="checkbox" checked={hacerActualizar} onChange={(e) => setHacerActualizar(e.target.checked)} />
                Actualizar costo y precio de {plan.actualizar.length} productos (el stock no se toca)
              </label>
            )}

            {plan.noEncontrados.length > 0 && (
              <div style={aviso}>
                No encontré en el sistema: {plan.noEncontrados.slice(0, 6).map((e) => e.nombre).join(' · ')}
                {plan.noEncontrados.length > 6 ? ` … y ${plan.noEncontrados.length - 6} más` : ''}.
                Revisá que el nombre sea igual al del sistema.
              </div>
            )}
            {plan.ambiguos.length > 0 && (
              <div style={aviso}>
                Hay {plan.ambiguos.length} nombres que existen en más de una categoría ({plan.ambiguos.slice(0, 3).map((e) => e.nombre).join(' · ')}…).
                Agregá una columna <code>categoria</code> para resolverlo.
              </div>
            )}
            {plan.sinMargen.length > 0 && (
              <div style={aviso}>
                {plan.sinMargen.length} productos no tienen margen cargado, así que no se pudo calcular el precio
                ({plan.sinMargen.slice(0, 3).map((e) => e.nombre).join(' · ')}…). Agregá una columna <code>precio</code> o <code>margen</code>.
              </div>
            )}

            <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
              <button
                style={hover('volver', btnSecundario)}
                onMouseEnter={() => setHoverBtn('volver')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={() => { setPaso('elegir'); setPlan(null) }}
              >
                Atrás
              </button>
              <button
                style={hover('confirmar', { ...btnPrimario, opacity: aHacer ? 1 : 0.5 })}
                onMouseEnter={() => setHoverBtn('confirmar')}
                onMouseLeave={() => setHoverBtn(null)}
                onClick={ejecutar}
                disabled={!aHacer}
              >
                Aplicar {aHacer} cambios
              </button>
            </div>
          </>
        )}

        {paso === 'procesando' && (
          <>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Procesando… {hechos} / {total}</div>
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
            <div style={caja}>
              <div>✅ Creados: <strong>{resultado.creados}</strong></div>
              <div>✅ Actualizados: <strong>{resultado.actualizados}</strong></div>
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