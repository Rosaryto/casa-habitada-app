// Backend de Supabase: datos en la nube y el cliente ve los informes desde su celular.
// Cada usuaria solo ve lo suyo (RLS en supabase/schema.sql); el dueño entra con su token.
import { createClient } from '@supabase/supabase-js'
import { nuevoId } from './ids.js'
import { tz } from './formato.js'
import { primerChoque, mensajeChoque } from './disponibilidad.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si no hay variables, store.js usa el backend de demo y nada de esto se toca.
export const disponible = Boolean(URL && KEY)

// PKCE: el link del mail vuelve con ?code=… y no choca con las rutas de la app (#/…).
const sb = disponible ? createClient(URL, KEY, { auth: { flowType: 'pkce' } }) : null

export const modoDemo = false

// ---------- Fotos en Storage ----------
// Todas las fotos de una visita: las generales y las de cada punto de la lista.
const fotosDeVisita = (v) => [...(v.fotos ?? []), ...(v.items ?? []).flatMap((i) => i.fotos ?? [])]

// La URL pública termina en /object/public/fotos/<usuario>/<archivo>.
const rutaEnStorage = (url) => {
  const marca = '/object/public/fotos/'
  const i = typeof url === 'string' ? url.indexOf(marca) : -1
  return i < 0 ? null : url.slice(i + marca.length)
}

// Borra las fotos del Storage. Mejor esfuerzo: si falla, el borrado de la
// visita o la casa igual sigue (queda un archivo de más, pero no se pierde nada).
async function borrarFotosDeStorage(urls) {
  const rutas = [...new Set(urls.map(rutaEnStorage).filter(Boolean))]
  if (!rutas.length) return
  try {
    await sb.storage.from('fotos').remove(rutas)
  } catch {
    /* mejor esfuerzo: no frenamos el borrado por esto */
  }
}

// ---------- Sesión ----------
export async function sesionActual() {
  const { data } = await sb.auth.getSession()
  // Si venimos del link del mail, sacamos el ?code=… de la dirección.
  if (location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash)
  return data.session
}

// Entrar sin contraseña: le mandamos un link al correo.
export async function mandarLinkDeEntrada(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname },
  })
  if (!error) return
  if (/rate|seconds|too many/i.test(error.message)) throw new Error('Pediste varios enlaces seguidos. Esperá un minuto y probá de nuevo.')
  if (/not found|signups not allowed|not allowed/i.test(error.message)) throw new Error('Ese correo no tiene usuario en la app. Revisá que esté bien escrito.')
  throw new Error('No se pudo mandar el enlace. Probá de nuevo en un rato.')
}

export function alCambiarSesion(cb) {
  const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s))
  return () => data.subscription.unsubscribe()
}

export async function entrar(email, clave) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: clave })
  if (error) throw new Error(/confirm/i.test(error.message) ? 'Falta confirmar el correo.' : 'El correo o la contraseña no coinciden. Probá entrar con un enlace al correo.')
  return data.session
}

export async function salir() {
  await sb.auth.signOut()
}

// ---------- Casas ----------
export async function listarCasas() {
  const { data, error } = await sb.from('casas').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function obtenerCasa(id) {
  const { data, error } = await sb.from('casas').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function guardarCasa(casa) {
  // token, creada y usuario los pone la base de datos; el resto va tal cual.
  const { id, token: _t, creada: _c, usuario: _u, ...campos } = casa
  const q = id
    ? sb.from('casas').update(campos).eq('id', id)
    : sb.from('casas').insert(campos)
  const { data, error } = await q.select().single()
  if (error) throw error
  return data
}

export async function borrarCasa(id) {
  // Juntamos las fotos antes de borrar: la casa borra sus visitas en cascada.
  let fotos = []
  try {
    const [rc, rv] = await Promise.all([
      sb.from('casas').select('foto').eq('id', id).maybeSingle(),
      sb.from('visitas').select('fotos, items').eq('casa_id', id),
    ])
    if (!rc.error && !rv.error) {
      fotos = [...(rc.data?.foto ? [rc.data.foto] : []), ...(rv.data ?? []).flatMap(fotosDeVisita)]
    }
  } catch {
    /* seguimos con el borrado igual */
  }
  const { error } = await sb.from('casas').delete().eq('id', id)
  if (error) throw error
  await borrarFotosDeStorage(fotos)
}

// ---------- Visitas ----------
// De a 1000 por vuelta y sin tope: el resumen del inicio no puede mentir
// con un límite de consulta, que cortaba las cuentas grandes.
export async function visitasParaResumen() {
  const visitas = []
  const TAM = 1000
  for (let desde = 0; ; desde += TAM) {
    const { data, error } = await sb
      .from('visitas').select('casa_id, inicio, tipo, fotos').order('inicio', { ascending: false })
      .range(desde, desde + TAM - 1)
    if (error) throw error
    visitas.push(...data)
    if (data.length < TAM) break
  }
  return visitas
}

export async function listarVisitas(casaId) {
  const { data, error } = await sb
    .from('visitas').select('*').eq('casa_id', casaId).order('inicio', { ascending: false })
  if (error) throw error
  return data
}

export async function guardarVisita(visita) {
  const { data, error } = await sb.from('visitas').insert(visita).select().single()
  if (error) throw error
  return data
}

export async function borrarVisita(id) {
  // Las fotos se juntan antes de borrar la fila.
  const previa = await sb.from('visitas').select('fotos, items').eq('id', id).maybeSingle()
  const { error } = await sb.from('visitas').delete().eq('id', id)
  if (error) throw error
  if (!previa.error && previa.data) await borrarFotosDeStorage(fotosDeVisita(previa.data))
}

// ---------- Agenda ----------
export async function listarProgramaciones(desde, hasta) {
  const { data, error } = await sb
    .from('programaciones').select('*')
    .gte('inicio', desde).lte('inicio', hasta)
    .order('inicio')
  if (error) throw error
  return data
}

export async function guardarProgramacion(bloque) {
  // Revalidamos el solape contra los bloques del día antes de escribir.
  const dia = new Date(bloque.inicio).toLocaleDateString('en-CA', { timeZone: tz })
  const { data: delDia, error } = await sb
    .from('programaciones').select('*')
    .gte('inicio', `${dia}T00:00:00-03:00`).lte('inicio', `${dia}T23:59:59-03:00`)
  if (error) throw error
  const choque = primerChoque((delDia ?? []).filter((b) => b.id !== bloque.id), bloque.inicio, bloque.fin)
  if (choque) {
    const { data: casa } = await sb.from('casas').select('nombre').eq('id', choque.casa_id).maybeSingle()
    throw new Error(mensajeChoque(casa?.nombre ?? 'otra casa', choque))
  }
  const campos = { casa_id: bloque.casa_id, inicio: bloque.inicio, fin: bloque.fin }
  const q = bloque.id
    ? sb.from('programaciones').update(campos).eq('id', bloque.id)
    : sb.from('programaciones').insert(campos)
  const { data, error: errorGuardar } = await q.select().single()
  if (errorGuardar) throw errorGuardar
  return data
}

export async function borrarProgramacion(id) {
  const { error } = await sb.from('programaciones').delete().eq('id', id)
  if (error) throw error
}

// ---------- Fotos ----------
export async function subirFoto(blob) {
  const { data: u } = await sb.auth.getUser()
  const ruta = `${u.user.id}/${nuevoId()}.jpg`
  const { error } = await sb.storage.from('fotos').upload(ruta, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return sb.storage.from('fotos').getPublicUrl(ruta).data.publicUrl
}

// ---------- Ejemplo (solo modo demo) ----------
export async function cargarEjemplo() {
  throw new Error('El ejemplo es solo del modo demo.')
}

// ---------- Informe público para el dueño ----------
export async function obtenerInforme(token) {
  const { data, error } = await sb.rpc('informe_publico', { p_token: token })
  if (error) throw error
  return data
}
