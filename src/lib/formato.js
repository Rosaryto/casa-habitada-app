export const tz = 'America/Argentina/Salta'
const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1)

export const fecha = (iso) =>
  mayus(new Date(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }))

export const fechaLarga = (iso) =>
  mayus(new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }))

export const hora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz })

export const duracion = (ini, fin) => {
  const min = Math.round((new Date(fin) - new Date(ini)) / 60000)
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}

// Link público del informe de una casa (el que se manda al dueño).
export const linkInforme = (token) =>
  `${location.origin}${location.pathname}#/informe/${token}`

// Acepta el número como lo escribe cualquiera ("0387 15-555-1234", "387 5551234", "5493875551234")
// y lo deja en el formato de WhatsApp: 549 + característica sin 0 + número sin 15.
export function numeroWhatsApp(telefono) {
  let n = (telefono || '').replace(/\D/g, '')
  if (n.startsWith('549')) return n
  if (n.startsWith('54')) return '549' + n.slice(2)
  n = n.replace(/^0/, '')
  // Característica de 3 o 4 cifras (Salta: 387) seguida de 15.
  const m = n.match(/^(\d{3,4})15(\d{6,7})$/)
  if (m && (m[1] + m[2]).length === 10) n = m[1] + m[2]
  return n.length === 10 ? '549' + n : n
}

export const linkWhatsApp = (telefono, texto) =>
  `https://wa.me/${numeroWhatsApp(telefono)}?text=${encodeURIComponent(texto)}`

export const novedades = (visita) => visita.items.filter((i) => i.estado === 'novedad')
