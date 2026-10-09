// Acceso a datos: una sola cara para las pantallas.
// Si hay variables de Supabase usa el backend de la nube (el cliente ve los
// informes desde su celular); si no, el de demo, que guarda todo en este
// navegador para probar la app sin configurar nada.
import { comprimirImagen } from './image.js'
import * as demo from './demo.js'
import * as nube from './supabase.js'

// El modo demo se activa solo si no hay Supabase configurado (desarrollo en tu
// equipo) o si se pide con "?demo" en la dirección. Ese segundo caso sirve para
// mostrar la app desde el sitio publicado SIN tocar la base real: usa solo el
// navegador de quien mira. La elección queda guardada en la pestaña.
const CLAVE_DEMO = 'casa-habitada-demo-pedido'

function pidieronDemo() {
  try {
    if (new URLSearchParams(window.location.search).has('demo')) {
      sessionStorage.setItem(CLAVE_DEMO, '1')
      return true
    }
    return sessionStorage.getItem(CLAVE_DEMO) === '1'
  } catch {
    return false
  }
}

// "Forzado" = hay Supabase configurado pero igual se pidió el demo: se puede
// volver al login real. "Normal" = sin Supabase, es el modo de tu equipo.
export const modoDemoForzado = nube.disponible && pidieronDemo()
const api = nube.disponible && !modoDemoForzado ? nube : demo

export const modoDemo = api.modoDemo

// Sale del demo pedido y vuelve al login real (sin la marca "?demo").
export function salirDelDemo() {
  try { sessionStorage.removeItem(CLAVE_DEMO) } catch { /* sin almacenamiento */ }
  window.location.href = window.location.pathname
}

// ---------- Sesión ----------
export const sesionActual = api.sesionActual
export const mandarLinkDeEntrada = api.mandarLinkDeEntrada
export const alCambiarSesion = api.alCambiarSesion
export const entrar = api.entrar
export const salir = api.salir

// ---------- Casas ----------
export const listarCasas = api.listarCasas
export const obtenerCasa = api.obtenerCasa
export const guardarCasa = api.guardarCasa
export const borrarCasa = api.borrarCasa

// ---------- Visitas ----------
// Última visita y visitas del mes de cada casa (para la pantalla de inicio).
export async function resumenVisitas() {
  const visitas = await api.visitasParaResumen()
  const hace30 = Date.now() - 30 * 864e5
  const res = {}
  for (const v of [...visitas].sort((a, b) => b.inicio.localeCompare(a.inicio))) {
    const r = (res[v.casa_id] ??= { ultima: v, foto: null, delMes: 0 })
    r.foto ??= v.fotos?.[0] ?? null
    if (new Date(v.inicio) >= hace30) r.delMes++
  }
  return res
}

export const listarVisitas = api.listarVisitas
export const guardarVisita = api.guardarVisita
export const borrarVisita = api.borrarVisita

// ---------- Agenda ----------
export const listarProgramaciones = api.listarProgramaciones
export const guardarProgramacion = api.guardarProgramacion
export const borrarProgramacion = api.borrarProgramacion

// ---------- Fotos ----------
// Las achica el mismo para los dos backends; el backend decide dónde quedan.
export async function subirFoto(archivo) {
  const blob = await comprimirImagen(archivo)
  return api.subirFoto(blob)
}

// ---------- Ejemplo (solo modo demo) ----------
export const cargarEjemplo = api.cargarEjemplo

// ---------- Informe público para el dueño ----------
export const obtenerInforme = api.obtenerInforme
