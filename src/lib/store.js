// Acceso a datos: una sola cara para las pantallas.
// Si hay variables de Supabase usa el backend de la nube (el cliente ve los
// informes desde su celular); si no, el de demo, que guarda todo en este
// navegador para probar la app sin configurar nada.
import { comprimirImagen } from './image.js'
import * as demo from './demo.js'
import * as nube from './supabase.js'

const api = nube.disponible ? nube : demo

export const modoDemo = api.modoDemo

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
