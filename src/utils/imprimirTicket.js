export function imprimirTicket({ venta, items, factura, descuento, negocio, pagos, cupon,  }) {
  const {
    nombre    = 'CanyFeliz Veterinaria',
    direccion = 'Tu dirección acá',
    cuit      = '20-99999999-9',
    iva       = 'Responsable Inscripto',
  } = negocio || {}

  const fecha = new Date(venta.fecha || Date.now())

  const fechaStr = fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const total = Number(venta.total).toLocaleString('es-AR', {
    minimumFractionDigits: 2
  })

  const tipoLabel = factura
    ? { 1: 'FACTURA A', 6: 'FACTURA B', 11: 'FACTURA C' }[factura.tipo_cbte] || 'FACTURA'
    : 'TICKET / PREVENTA'

  const itemsHTML = items.map(i => `
    <tr>
      <td style="padding:2px 0">${i.nombre}</td>
      <td style="text-align:center;padding:2px 4px">${i.cantidad}</td>
      <td style="text-align:right;padding:2px 0">
        $${(i.precio_unit * i.cantidad).toLocaleString('es-AR', {
          minimumFractionDigits: 2
        })}
      </td>
    </tr>
    <tr>
      <td colspan="3" style="font-size:10px;color:#666;padding-bottom:3px">
        $${Number(i.precio_unit).toLocaleString('es-AR', {
          minimumFractionDigits: 2
        })} c/u
      </td>
    </tr>
  `).join('')

  // NUEVO: soporte para múltiples medios de pago
  const pagosHTML = pagos?.length > 1
    ? pagos.map(p => `
        <div style="font-size:10px">
          ${p.medio_pago}: $${Number(p.monto).toLocaleString('es-AR', {
            minimumFractionDigits: 2
          })}
        </div>
      `).join('')
    : `
        <div style="font-size:10px">
          Medio de pago: ${venta.medio_pago}
        </div>
      `

  // NUEVO: mostrar cupón aplicado
  const cuponHTML = cupon?.aplicado
    ? `<div class="line"></div>
       <div style="font-size:10px;display:flex;justify-content:space-between">
         <span>🎟️ Cupón aplicado</span>
         <span>−$${Number(cupon.monto).toLocaleString('es-AR', {
           minimumFractionDigits: 2
         })}</span>
       </div>`
    : ''

  const caeHTML = factura ? `
    <div style="border-top:1px dashed #000;margin-top:8px;padding-top:8px">
      <div style="font-size:10px">
        CAE: <strong>${factura.cae}</strong>
      </div>
      <div style="font-size:10px">
        Vto. CAE: ${factura.cae_vto}
      </div>
      <div style="font-size:10px">
        Comp. Nro: ${String(factura.nro_cbte).padStart(8, '0')}
      </div>
    </div>
  ` : `
    <div style="border-top:1px dashed #000;margin-top:8px;padding-top:8px;text-align:center">
      <div style="font-size:10px;color:#666">
        Este ticket no es válido como factura
      </div>
    </div>
  `

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />

      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 72mm;
          padding: 4mm;
          color: #000;
        }

        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }

          body {
            width: 72mm;
          }
        }

        .center {
          text-align: center;
        }

        .bold {
          font-weight: bold;
        }

        .line {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          font-size: 10px;
          border-bottom: 1px solid #000;
          padding: 2px 0;
        }
      </style>
    </head>

    <body>
      <div class="center bold" style="font-size:15px">
        ${nombre}
      </div>

      <div class="center" style="font-size:10px">
        ${direccion}
      </div>

      <div class="center" style="font-size:10px">
        CUIT: ${cuit}
      </div>

      <div class="center" style="font-size:10px">
        ${iva}
      </div>

      <div class="line"></div>

      <div class="center bold" style="font-size:14px">
        ${tipoLabel}
      </div>

      ${
        factura
          ? `
            <div class="center" style="font-size:10px">
              Pto. Vta: ${String(factura.punto_venta).padStart(4, '0')}
            </div>
          `
          : ''
      }

      <div class="center" style="font-size:10px">
        ${fechaStr}
      </div>

      ${pagosHTML}

      <div class="line"></div>

      <table>
        <thead>
          <tr>
            <th style="text-align:left">Producto</th>
            <th style="text-align:center">Cant</th>
            <th style="text-align:right">Subtotal</th>
          </tr>
        </thead>

        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="line"></div>

      ${cuponHTML}

      <table>
        <tr>
          <td class="bold" style="font-size:14px">
            TOTAL
          </td>

          <td class="bold" style="font-size:14px;text-align:right">
            $${total}
          </td>
        </tr>
      </table>

      ${caeHTML}

      <div class="line"></div>

      <div class="center" style="font-size:10px;margin-top:4px">
        ¡Gracias por su visita!
      </div>

      <div class="center" style="font-size:10px">
        🐾 CanyFeliz
      </div>
    </body>
    </html>
  `

  const ventana = window.open('', '_blank', 'width=350,height=600')

  ventana.document.write(html)
  ventana.document.close()
  ventana.focus()

  setTimeout(() => {
    ventana.print()
    ventana.close()
  }, 500)
}