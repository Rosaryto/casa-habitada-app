// Backend de demo: todo queda en el navegador (localStorage), sin configurar nada.
// Las fotos se guardan como data URLs adentro del mismo guardado.
import { nuevoId, nuevoToken } from './ids.js'
import { CASA_EJEMPLO, visitasEjemplo } from './ejemplo.js'

const LS = 'casa-habitada-demo'
const CLAVE_SESION = LS + '-sesion'

export const modoDemo = true

function leer() {
  try {
    return JSON.parse(localStorage.getItem(LS)) ?? { casas: [], visitas: [] }
  } catch {
    return { casas: [], visitas: [] }
  }
}

function escribir(db) {
  try {
    localStorage.setItem(LS, JSON.stringify(db))
  } catch {
    throw new Error('No hay más espacio en el modo demo. Borrá fotos o configurá Supabase.')
  }
}

// ---------- Sesión ----------
export async function sesionActual() {
  return localStorage.getItem(CLAVE_SESION) ? { demo: true } : null
}

export async function mandarLinkDeEntrada() {
  throw new Error('En modo demo entrás sin contraseña.')
}

export function alCambiarSesion() {
  return () => {}
}

export async function entrar() {
  localStorage.setItem(CLAVE_SESION, '1')
  return { demo: true }
}

export async function salir() {
  localStorage.removeItem(CLAVE_SESION)
}

// ---------- Casas ----------
export async function listarCasas() {
  return leer().casas.sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function obtenerCasa(id) {
  return leer().casas.find((c) => c.id === id) ?? null
}

export async function guardarCasa(casa) {
  const db = leer()
  const i = db.casas.findIndex((c) => c.id === casa.id)
  const final = i >= 0
    ? { ...db.casas[i], ...casa }
    : { ...casa, id: nuevoId(), token: nuevoToken(), creada: new Date().toISOString() }
  if (i >= 0) db.casas[i] = final
  else db.casas.push(final)
  escribir(db)
  return final
}

export async function borrarCasa(id) {
  const db = leer()
  db.casas = db.casas.filter((c) => c.id !== id)
  db.visitas = db.visitas.filter((v) => v.casa_id !== id)
  escribir(db)
}

// ---------- Visitas ----------
export async function visitasParaResumen() {
  return leer().visitas
}

export async function listarVisitas(casaId) {
  return leer().visitas
    .filter((v) => v.casa_id === casaId)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
}

export async function guardarVisita(visita) {
  const db = leer()
  const final = { ...visita, id: nuevoId() }
  db.visitas.push(final)
  escribir(db)
  return final
}

export async function borrarVisita(id) {
  const db = leer()
  db.visitas = db.visitas.filter((v) => v.id !== id)
  escribir(db)
}

// ---------- Fotos ----------
export async function subirFoto(blob) {
  return await new Promise((ok) => {
    const r = new FileReader()
    r.onload = () => ok(r.result)
    r.readAsDataURL(blob)
  })
}

// ---------- Ejemplo ----------
export async function cargarEjemplo() {
  const db = leer()
  const existente = db.casas.find((c) => c.token === CASA_EJEMPLO.token)
  if (existente) return existente
  const casa = { ...CASA_EJEMPLO, id: nuevoId(), creada: new Date().toISOString() }
  db.casas.push(casa)
  for (const v of visitasEjemplo()) db.visitas.push({ ...v, id: nuevoId(), casa_id: casa.id })
  escribir(db)
  return casa
}

// ---------- Informe público para el dueño ----------
export async function obtenerInforme(token) {
  if (token === CASA_EJEMPLO.token) await cargarEjemplo()
  const db = leer()
  const casa = db.casas.find((c) => c.token === token)
  if (!casa) return null
  const visitas = db.visitas
    .filter((v) => v.casa_id === casa.id)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
  return { casa, visitas }
}
