import { tz } from './formato.js'

// Cada cuántos días toca visitar una casa según su plan.
const INTERVALO = {
  'Plan Compañía': 1,
  'Plan Turno Minero con mascotas': 1,
  'Plan Presente': 2,
  'Plan Turno Minero': 2,
  'Plan Tranquilo': 7,
}
const diaDe = (fecha) => new Date(fecha).toLocaleDateString('en-CA', { timeZone: tz }) // AAAA-MM-DD
const diasEntre = (a, b) => Math.round((new Date(diaDe(b)) - new Date(diaDe(a))) / 864e5)

// Estado de una casa para la pantalla de inicio.
export function estadoCasa(casa, ultima, ahora = Date.now()) {
  const cada = INTERVALO[casa.plan]
  if (ultima && diasEntre(ultima.inicio, ahora) === 0) return { clave: 'hecha', texto: 'Visitada hoy' }
  if (!cada) return { clave: 'libre', texto: casa.plan === 'Visita suelta' ? 'Visita suelta' : 'Sin plan fijo' }
  if (!ultima) return { clave: 'toca', texto: 'Primera visita' }
  const pasaron = diasEntre(ultima.inicio, ahora)
  if (pasaron >= cada) return { clave: 'toca', texto: pasaron > cada ? `Atrasada ${pasaron - cada} ${pasaron - cada === 1 ? 'día' : 'días'}` : 'Toca hoy' }
  const faltan = cada - pasaron
  return { clave: 'al-dia', texto: faltan === 1 ? 'Toca mañana' : `Toca en ${faltan} días` }
}

// "hoy 10:05", "ayer", "hace 3 días"
export function haceCuanto(iso, ahora = Date.now()) {
  const d = diasEntre(iso, ahora)
  const h = new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz })
  if (d === 0) return `hoy ${h}`
  if (d === 1) return `ayer ${h}`
  return `hace ${d} días`
}

export function saludo(ahora = new Date()) {
  const h = Number(ahora.toLocaleTimeString('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: tz }))
  return h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

// Para la tarjeta de "última visita": valor corto y detalle.
export function ultimaCorta(iso, ahora = Date.now()) {
  const d = diasEntre(iso, ahora)
  const h = new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz })
  if (d === 0) return { valor: 'Hoy', detalle: `última visita, ${h}` }
  if (d === 1) return { valor: 'Ayer', detalle: `última visita, ${h}` }
  return { valor: `${d} días`, detalle: 'desde la última visita' }
}
