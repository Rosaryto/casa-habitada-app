import test, { before } from 'node:test'
import assert from 'node:assert/strict'

const almacen = new Map()
globalThis.localStorage = {
  getItem: (k) => almacen.get(k) ?? null,
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
}

const demo = await import('../src/lib/demo.js')

const salta = (hhmm) => `2026-03-10T${hhmm}:00-03:00`
const rango = [salta('00:00'), salta('23:59')]
let casa

before(async () => {
  casa = await demo.guardarCasa({ nombre: 'Los Álamos' })
})

test('guarda y lista programaciones por rango', async () => {
  const b = await demo.guardarProgramacion({ casa_id: casa.id, inicio: salta('09:00'), fin: salta('11:00') })
  assert.ok(b.id)
  const lista = await demo.listarProgramaciones(...rango)
  assert.equal(lista.length, 1)
  assert.equal(lista[0].id, b.id)
})

test('rechaza un bloque que pisa a otro', async () => {
  await assert.rejects(
    demo.guardarProgramacion({ casa_id: casa.id, inicio: salta('10:00'), fin: salta('12:00') }),
    /ya ocupa de 09:00 a 11:00/,
  )
})

test('mover un bloque no choca consigo mismo', async () => {
  const [b] = await demo.listarProgramaciones(...rango)
  const movido = await demo.guardarProgramacion({ ...b, fin: salta('12:00') })
  assert.equal(movido.fin, salta('12:00'))
})

test('borrar una casa se lleva sus programaciones', async () => {
  const [b] = await demo.listarProgramaciones(...rango)
  await demo.borrarProgramacion(b.id)
  await demo.guardarProgramacion({ casa_id: casa.id, inicio: salta('09:00'), fin: salta('10:00') })
  await demo.borrarCasa(casa.id)
  assert.deepEqual(await demo.listarProgramaciones(...rango), [])
})
