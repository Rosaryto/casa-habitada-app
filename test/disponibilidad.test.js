import test from 'node:test'
import assert from 'node:assert/strict'
import { haySolape, primerChoque, huecosLibres, mensajeChoque } from '../src/lib/disponibilidad.js'

// Todo el día 2026-03-10 en Salta (UTC-3 fijo).
const dia = '2026-03-10'
const salta = (hhmm) => `${dia}T${hhmm}:00-03:00`

test('horarios que se tocan en el borde no se pisan', () => {
  const bloques = [{ inicio: salta('09:00'), fin: salta('11:00') }]
  assert.equal(haySolape(bloques, salta('11:00'), salta('12:00')), false)
  assert.equal(haySolape(bloques, salta('08:00'), salta('09:00')), false)
})

test('detecta solape parcial y total', () => {
  const bloques = [{ inicio: salta('09:00'), fin: salta('11:00') }]
  assert.equal(haySolape(bloques, salta('10:00'), salta('12:00')), true)
  assert.equal(haySolape(bloques, salta('09:30'), salta('10:30')), true)
  assert.equal(primerChoque(bloques, salta('10:00'), salta('12:00')).inicio, salta('09:00'))
  assert.equal(primerChoque(bloques, salta('12:00'), salta('13:00')), null)
})

test('mensajeChoque nombra la casa y las horas', () => {
  assert.equal(
    mensajeChoque('Los Álamos', { inicio: salta('09:00'), fin: salta('11:00') }),
    'La casa Los Álamos ya ocupa de 09:00 a 11:00',
  )
})

test('día vacío tiene un solo hueco de 06:00 a 23:00', () => {
  assert.deepEqual(huecosLibres([], dia), [
    { inicio: '2026-03-10T09:00:00.000Z', fin: '2026-03-11T02:00:00.000Z' },
  ])
})

test('huecos entre bloques desordenados, recortados a la ventana', () => {
  const bloques = [
    { inicio: salta('14:00'), fin: salta('15:00') },
    { inicio: salta('05:00'), fin: salta('07:00') }, // arranca antes de la ventana
    { inicio: salta('09:00'), fin: salta('11:00') },
  ]
  assert.deepEqual(huecosLibres(bloques, dia), [
    { inicio: '2026-03-10T10:00:00.000Z', fin: '2026-03-10T12:00:00.000Z' }, // 07:00–09:00
    { inicio: '2026-03-10T14:00:00.000Z', fin: '2026-03-10T17:00:00.000Z' }, // 11:00–14:00
    { inicio: '2026-03-10T18:00:00.000Z', fin: '2026-03-11T02:00:00.000Z' }, // 15:00–23:00
  ])
})

test('un bloque que se pasa del cierre no deja hueco después', () => {
  const huecos = huecosLibres([{ inicio: salta('22:00'), fin: salta('23:30') }], dia)
  assert.equal(huecos.length, 1)
  assert.equal(huecos[0].fin, '2026-03-11T01:00:00.000Z') // termina 22:00 Salta
})
