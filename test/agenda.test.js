import test from 'node:test'
import assert from 'node:assert/strict'
import { estadoCasa, haceCuanto, saludo, ultimaCorta } from '../src/lib/agenda.js'

// Mitad del día en Salta (UTC-3) para que el día no se corra.
const HOY = '2026-03-10T13:00:00Z'
const haceDias = (n) => new Date(Date.parse(HOY) - n * 864e5).toISOString()

test('sin visita previa toca siempre', () => {
  assert.deepEqual(estadoCasa({ plan: 'Plan Presente' }, null), { clave: 'toca', texto: 'Primera visita' })
})

test('visita hecha hoy queda como hecha, aunque el plan pida cada 7 días', () => {
  const r = estadoCasa({ plan: 'Plan Tranquilo' }, { inicio: HOY }, Date.parse(HOY))
  assert.equal(r.clave, 'hecha')
})

test('planes sin intervalo fijo quedan libres', () => {
  assert.deepEqual(estadoCasa({ plan: 'Visita suelta' }, { inicio: haceDias(10) }, Date.parse(HOY)),
    { clave: 'libre', texto: 'Visita suelta' })
  assert.deepEqual(estadoCasa({ plan: null }, { inicio: haceDias(1) }, Date.parse(HOY)),
    { clave: 'libre', texto: 'Sin plan fijo' })
})

test('según el plan se atrasa, toca hoy o está al día', () => {
  const ahora = Date.parse(HOY)
  assert.deepEqual(estadoCasa({ plan: 'Plan Tranquilo' }, { inicio: haceDias(8) }, ahora),
    { clave: 'toca', texto: 'Atrasada 1 día' })
  assert.deepEqual(estadoCasa({ plan: 'Plan Tranquilo' }, { inicio: haceDias(10) }, ahora),
    { clave: 'toca', texto: 'Atrasada 3 días' })
  assert.deepEqual(estadoCasa({ plan: 'Plan Presente' }, { inicio: haceDias(2) }, ahora),
    { clave: 'toca', texto: 'Toca hoy' })
  assert.deepEqual(estadoCasa({ plan: 'Plan Presente' }, { inicio: haceDias(1) }, ahora),
    { clave: 'al-dia', texto: 'Toca mañana' })
})

test('haceCuanto cuenta en días de Salta', () => {
  const ahora = Date.parse(HOY)
  assert.match(haceCuanto(HOY, ahora), /^hoy 10:00$/)
  assert.match(haceCuanto(haceDias(1), ahora), /^ayer 10:00$/)
  assert.equal(haceCuanto(haceDias(3), ahora), 'hace 3 días')
})

test('ultimaCorta da valor corto y detalle', () => {
  const ahora = Date.parse(HOY)
  assert.equal(ultimaCorta(HOY, ahora).valor, 'Hoy')
  assert.equal(ultimaCorta(haceDias(1), ahora).valor, 'Ayer')
  assert.equal(ultimaCorta(haceDias(4), ahora).valor, '4 días')
})

test('saludo según la hora de Salta', () => {
  assert.equal(saludo(new Date('2026-03-10T12:00:00Z')), 'Buen día')
  assert.equal(saludo(new Date('2026-03-10T17:00:00Z')), 'Buenas tardes')
  assert.equal(saludo(new Date('2026-03-11T00:00:00Z')), 'Buenas noches')
})
