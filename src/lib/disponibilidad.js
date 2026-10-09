import { hora } from './formato.js'

// Ventana visible de la agenda: se agenda solo entre las 06:00 y las 23:00.
export const VENTANA = { abre: 6, cierra: 23 }

const hh = (n) => String(n).padStart(2, '0')

// Primer bloque que se pisa con el rango pedido, o null si no hay ninguno.
// Tocarse en el borde (fin 11:00 / inicio 11:00) cuenta como libre.
export function primerChoque(bloques, inicio, fin) {
  return bloques.find((b) => new Date(b.inicio) < new Date(fin) && new Date(inicio) < new Date(b.fin)) ?? null
}

export const haySolape = (bloques, inicio, fin) => primerChoque(bloques, inicio, fin) !== null

export function mensajeChoque(nombre, bloque) {
  return `La casa ${nombre} ya ocupa de ${hora(bloque.inicio)} a ${hora(bloque.fin)}`
}

// Huecos libres del día dentro de la ventana 06:00–23:00 (hora de Salta).
// Los bloques que se salen de la ventana se recortan.
export function huecosLibres(bloques, dia) {
  const abre = new Date(`${dia}T${hh(VENTANA.abre)}:00:00-03:00`)
  const cierra = new Date(`${dia}T${hh(VENTANA.cierra)}:00:00-03:00`)
  const ocupados = bloques
    .map((b) => ({ ini: new Date(b.inicio), fin: new Date(b.fin) }))
    .map((b) => ({ ini: new Date(Math.max(b.ini, abre)), fin: new Date(Math.min(b.fin, cierra)) }))
    .filter((b) => b.fin > b.ini)
    .sort((a, b) => a.ini - b.ini)
  const huecos = []
  let cursor = abre
  for (const b of ocupados) {
    if (b.ini > cursor) huecos.push({ inicio: cursor.toISOString(), fin: b.ini.toISOString() })
    if (b.fin > cursor) cursor = b.fin
  }
  if (cursor < cierra) huecos.push({ inicio: cursor.toISOString(), fin: cierra.toISOString() })
  return huecos
}
