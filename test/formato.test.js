import test from 'node:test'
import assert from 'node:assert/strict'
import { numeroWhatsApp, duracion, fecha, fechaLarga, hora, linkInforme, novedades } from '../src/lib/formato.js'

// Todas las horas de estos tests son 10:00 en Salta (UTC-3).
const ISO = '2026-03-10T13:00:00Z'

test('numeroWhatsApp deja todo en formato 549 + característica sin 0 + número sin 15', () => {
  assert.equal(numeroWhatsApp('0387 15-555-1234'), '5493875551234')
  assert.equal(numeroWhatsApp('387 5551234'), '5493875551234')
  assert.equal(numeroWhatsApp('54 387 5551234'), '5493875551234')
  assert.equal(numeroWhatsApp('5493875551234'), '5493875551234')
})

test('numeroWhatsApp no toca lo que no entiende', () => {
  assert.equal(numeroWhatsApp('387555123'), '387555123')
  assert.equal(numeroWhatsApp(''), '')
  assert.equal(numeroWhatsApp(undefined), '')
})

test('duracion arma minutos u horas', () => {
  assert.equal(duracion(ISO, '2026-03-10T13:45:00Z'), '45 min')
  assert.equal(duracion(ISO, '2026-03-10T15:30:00Z'), '2 h 30 min')
  assert.equal(duracion(ISO, ISO), '0 min')
})

test('hora y fecha usan la hora de Salta', () => {
  assert.equal(hora(ISO), '10:00')
  assert.match(fechaLarga(ISO), /^Martes,?\s+10 de marzo$/)
  assert.match(fecha(ISO), /10/)
})

test('linkInforme arma el enlace del dueño contra la dirección actual', () => {
  globalThis.location = { origin: 'https://ejemplo.com', pathname: '/casa/' }
  assert.equal(linkInforme('abc123'), 'https://ejemplo.com/casa/#/informe/abc123')
})

test('novedades devuelve solo los puntos marcados como problema', () => {
  const visita = {
    items: [
      { estado: 'ok' },
      { estado: 'novedad', texto: 'Pileta bajo nivel' },
      { estado: 'na' },
      { estado: 'novedad', texto: 'Llave floja' },
    ],
  }
  assert.equal(novedades(visita).length, 2)
  assert.equal(novedades(visita)[0].texto, 'Pileta bajo nivel')
})
