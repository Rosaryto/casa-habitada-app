# Agenda con bloques de horarios — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pantalla de Agenda donde la usuaria carga bloques `{casa, inicio, fin}` por día, ve los huecos libres y el sistema bloquea cualquier horario que pise a otro.

**Architecture:** Tabla nueva `programaciones` (independiente de `visitas`), con una lógica pura de disponibilidad (`src/lib/disponibilidad.js`) que comparten los dos backends (demo y Supabase) y la UI. Fachada `store.js` sin cambios de patrón: tres métodos nuevos re-exportados. Pantalla `Agenda.jsx` con línea de tiempo de un día, entrada desde el inicio y ruta lazy.

**Tech Stack:** React 19, Vite 8, react-router-dom 7 (`HashRouter`), `@supabase/supabase-js`, oxlint, `node --test` (runner nativo, sin dependencias nuevas).

**Spec:** `docs/superpowers/specs/2026-10-08-agenda-disponibilidad-design.md`

## Global Constraints

- **Sin dependencias nuevas.** Tests con `node --test` (Node 24 ya instalado). No agregar vitest ni testing-library.
- **Idioma:** toda la UI y los comentarios en español rioplatense, en el tono existente ("Tocá", "Podés", "Reintentar").
- **Zona horaria:** `America/Argentina/Salta` (UTC-3 fijo, sin horario de verano). Todas las fechas locales se arman con offset literal `-03:00`.
- **Ventana visible:** 06:00–23:00 del mismo día. No hay bloques que crucen la medianoche.
- **Sin `new Date()` ni `Date.now()` sueltos dentro del cuerpo/render de un componente React** (oxlint lo marca como impureza). Sólo en helpers de módulo, efectos o al cargar datos.
- **Verificación obligatoria al final de cada task:** `npx oxlint` (exit 0, sin warnings) y `npm test` (todo verde). El build completo se corre en la Task 4.
- **Git:** el proyecto todavía no es un repo. La Task 0 lo inicializa.

## Review Focus

Clases de entrada / modos de falla que el spec no ejercita pero que harían fallar la app, con su test en la task que corresponde:

1. **Bloque que empieza antes de las 06:00 o termina después de las 23:00** → debe recortarse a la ventana, no salirse del marco. (Task 1, test de recorte.)
2. **Dos bloques que se tocan en el borde exacto (fin 11:00 / inicio 11:00)** → debe permitirse, no marcarse como choque. (Task 1, test de borde.)
3. **Editar un bloque sin cambiarle el horario** → no debe chocar consigo mismo. (Task 2, test de mover.)
4. **Bloques desordenados en los datos** → los huecos deben salir ordenados y sin solaparse entre sí. (Task 1, test de desordenados.)
5. **Casa borrada con bloques en la agenda** → los bloques deben desaparecer (no quedar huérfanos). (Task 2, test de cascada.)

---

### Task 0: Inicializar el repositorio git

**Files:**
- Create: `.git` (repo)
- Verify: `.gitignore`

**Interfaces:**
- Consumes: nada.
- Produces: repo git con un commit base; los commits por task a partir de acá.

- [ ] **Step 1: Confirmar que `.gitignore` cubre lo necesario**

Run: `Get-Content .gitignore`
Expected: aparece `node_modules`, `dist`, `.env` (ya está versionado en el proyecto).

- [ ] **Step 2: Inicializar y commitear el estado actual**

```powershell
git init
git add -A
git commit -m "chore: estado base de Casa Habitada (refactor e informe previos)"
```

- [ ] **Step 3: Verificar**

Run: `git log --oneline -1 && git status --short`
Expected: un commit y árbol limpio (nada sin commitear).

---

### Task 1: Lógica de disponibilidad (pura)

**Files:**
- Create: `src/lib/disponibilidad.js`
- Test: `test/disponibilidad.test.js`

**Interfaces:**
- Consumes: `hora(iso)` de `src/lib/formato.js`.
- Produces:
  - `VENTANA: { abre: number, cierra: number }` (6 y 23).
  - `primerChoque(bloques, inicio, fin) → bloque | null`
  - `haySolape(bloques, inicio, fin) → boolean`
  - `mensajeChoque(nombre, bloque) → string`
  - `huecosLibres(bloques, dia) → [{ inicio: ISO, fin: ISO }]`

- [ ] **Step 1: Escribir los tests que fallan**

Create `test/disponibilidad.test.js`:

```js
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
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `npm test`
Expected: FAIL — `Cannot find module .../src/lib/disponibilidad.js`.

- [ ] **Step 3: Implementar `disponibilidad.js`**

Create `src/lib/disponibilidad.js`:

```js
import { hora } from './formato.js'

// Ventana visible de la agenda: se agenda solo entre las 06:00 y las 23:00.
export const VENTANA = { abre: 6, cierra: 23 }

const hh = (n) => String(n).padStart(2, '0')

// Primer bloque que se pisa con el rango pedido, o null si no hay ninguno.
// Se tocan en el borde (fin 11:00 / inicio 11:00) cuenta como libre.
export function primerChoque(bloques, inicio, fin) {
  return bloques.find((b) => new Date(b.inicio) < new Date(fin) && new Date(inicio) < new Date(b.fin)) ?? null
}

export const haySolape = (bloques, inicio, fin) => primerChoque(bloques, inicio, fin) !== null

export function mensajeChoque(nombre, bloque) {
  return `La casa ${nombre} ya ocupa de ${hora(bloque.inicio)} a ${hora(bloque.fin)}`
}

// Huecos libres del día dentro de la ventana 06:00–23:00 (hora de Salta).
// Los bloques que se salen de la ventana se recortan.
export function huecosLibres(bloques, dia) {
  const abre = new Date(`${dia}T${hh(VENTANA.abre)}:00:00-03:00`)
  const cierra = new Date(`${dia}T${hh(VENTANA.cierra)}:00:00-03:00`)
  const ocupados = bloques
    .map((b) => ({ ini: new Date(b.inicio), fin: new Date(b.fin) }))
    .map((b) => ({ ini: new Date(Math.max(b.ini, abre)), fin: new Date(Math.min(b.fin, cierra)) }))
    .filter((b) => b.fin > b.ini)
    .sort((a, b) => a.ini - b.ini)
  const huecos = []
  let cursor = abre
  for (const b of ocupados) {
    if (b.ini > cursor) huecos.push({ inicio: cursor.toISOString(), fin: b.ini.toISOString() })
    if (b.fin > cursor) cursor = b.fin
  }
  if (cursor < cierra) huecos.push({ inicio: cursor.toISOString(), fin: cierra.toISOString() })
  return huecos
}
```

- [ ] **Step 4: Correr los tests y ver que pasan**

Run: `npm test`
Expected: PASS (todos los tests de `disponibilidad.test.js`, más los que ya existían).

- [ ] **Step 5: Lint**

Run: `npx oxlint`
Expected: exit 0, sin warnings.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/disponibilidad.js test/disponibilidad.test.js
git commit -m "feat: lógica pura de disponibilidad de horarios"
```

---

### Task 2: Backend demo + tests

**Files:**
- Modify: `src/lib/demo.js`
- Test: `test/programaciones.test.js`

**Interfaces:**
- Consumes: `primerChoque`, `mensajeChoque` de `src/lib/disponibilidad.js`; `tz` de `src/lib/formato.js`; `nuevoId` de `src/lib/ids.js` (ya importado).
- Produces:
  - `listarProgramaciones(desde, hasta) → [{ id, casa_id, inicio, fin, creada }]` (ordenado por `inicio`)
  - `guardarProgramacion({ id?, casa_id, inicio, fin }) → bloque` (lanza `Error` con mensaje legible si pisa)
  - `borrarProgramacion(id) → void`
  - `borrarCasa(id)` ahora también borra las programaciones de esa casa.

- [ ] **Step 1: Escribir el test que falla**

Create `test/programaciones.test.js`:

```js
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
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm test`
Expected: FAIL — `demo.guardarProgramacion is not a function`.

- [ ] **Step 3: Implementar en `demo.js`**

Modify `src/lib/demo.js`. En los imports de arriba, agregar:

```js
import { tz } from './formato.js'
import { primerChoque, mensajeChoque } from './disponibilidad.js'
```

Cambiar el valor por defecto de `leer()` (las dos ocurrencias) para incluir `programaciones`:

```js
function leer() {
  try {
    return JSON.parse(localStorage.getItem(LS)) ?? { casas: [], visitas: [], programaciones: [] }
  } catch {
    return { casas: [], visitas: [], programaciones: [] }
  }
}
```

En `borrarCasa`, agregar el filtro de programaciones:

```js
export async function borrarCasa(id) {
  const db = leer()
  db.casas = db.casas.filter((c) => c.id !== id)
  db.visitas = db.visitas.filter((v) => v.casa_id !== id)
  db.programaciones = (db.programaciones ?? []).filter((p) => p.casa_id !== id)
  escribir(db)
}
```

Al final del archivo (antes de `cargarEjemplo` o al lado de las visitas), agregar la sección de agenda:

```js
// ---------- Agenda ----------
const diaDe = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: tz })

export async function listarProgramaciones(desde, hasta) {
  return (leer().programaciones ?? [])
    .filter((b) => b.inicio >= desde && b.inicio <= hasta)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}

export async function guardarProgramacion(bloque) {
  const db = leer()
  db.programaciones ??= []
  const dia = diaDe(bloque.inicio)
  const otros = db.programaciones.filter((b) => b.id !== bloque.id && diaDe(b.inicio) === dia)
  const choque = primerChoque(otros, bloque.inicio, bloque.fin)
  if (choque) {
    const casa = db.casas.find((c) => c.id === choque.casa_id)
    throw new Error(mensajeChoque(casa?.nombre ?? 'otra casa', choque))
  }
  const i = db.programaciones.findIndex((b) => b.id === bloque.id)
  const final = i >= 0
    ? { ...db.programaciones[i], ...bloque }
    : { ...bloque, id: nuevoId(), creada: new Date().toISOString() }
  if (i >= 0) db.programaciones[i] = final
  else db.programaciones.push(final)
  escribir(db)
  return final
}

export async function borrarProgramacion(id) {
  const db = leer()
  db.programaciones = (db.programaciones ?? []).filter((b) => b.id !== id)
  escribir(db)
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm test`
Expected: PASS (todos los de `programaciones.test.js`).

- [ ] **Step 5: Lint y commit**

```powershell
npx oxlint
git add src/lib/demo.js test/programaciones.test.js
git commit -m "feat: backend demo de programaciones con validación de solape"
```

---

### Task 3: Backend Supabase, esquema y fachada

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/lib/supabase.js`
- Modify: `src/lib/store.js`

**Interfaces:**
- Consumes: `primerChoque`, `mensajeChoque` de `src/lib/disponibilidad.js`; `tz` de `src/lib/formato.js`; `sb` (cliente) ya existente.
- Produces: los mismos tres métodos que la Task 2 (`listarProgramaciones`, `guardarProgramacion`, `borrarProgramacion`), ahora como named exports de `src/lib/supabase.js`, más los re-exports en `store.js` para que la UI los use con `import { guardarProgramacion } from '../lib/store.js'`.

_Nota: este backend no se puede testear con `node --test` (necesita red y el cliente de Supabase). Se verifica con lint + build en el Step 5._

- [ ] **Step 1: Agregar la tabla al esquema**

Modify `supabase/schema.sql`. Después del bloque `create index on public.visitas (casa_id, inicio desc);` (línea 34), insertar:

```sql

-- ---------- Agenda: bloques de horarios programados ----------
create table public.programaciones (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null default auth.uid() references auth.users on delete cascade,
  casa_id uuid not null references public.casas on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  creada timestamptz not null default now(),
  check (fin > inicio)
);
create index on public.programaciones (inicio);

alter table public.programaciones enable row level security;
grant select, insert, update, delete on public.programaciones to authenticated;
revoke all on public.programaciones from anon;

create policy "mis programaciones" on public.programaciones
  for all to authenticated
  using (usuario = auth.uid())
  with check (
    usuario = auth.uid()
    and exists (select 1 from public.casas c where c.id = casa_id and c.usuario = auth.uid())
  );
```

- [ ] **Step 2: Implementar en `supabase.js`**

Modify `src/lib/supabase.js`. Agregar a los imports:

```js
import { tz } from './formato.js'
import { primerChoque, mensajeChoque } from './disponibilidad.js'
```

Después de `borrarVisita` (línea 154), agregar:

```js
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
```

- [ ] **Step 3: Re-exportar en `store.js`**

Modify `src/lib/store.js`. Después del bloque `// ---------- Visitas ----------` (línea 42), agregar:

```js
// ---------- Agenda ----------
export const listarProgramaciones = api.listarProgramaciones
export const guardarProgramacion = api.guardarProgramacion
export const borrarProgramacion = api.borrarProgramacion
```

- [ ] **Step 4: Verificar lint y que la fachada resuelve los dos backends**

Run: `npx oxlint`
Expected: exit 0, sin warnings.

Run: `node -e "import('./src/lib/disponibilidad.js').then(()=>console.log('ok'))"`
Expected: imprime `ok` (confirma que el módulo puro carga sin depender de React).

- [ ] **Step 5: Commit**

```powershell
git add supabase/schema.sql src/lib/supabase.js src/lib/store.js
git commit -m "feat: programaciones en Supabase y fachada del store"
```

---

### Task 4: Pantalla de Agenda, entrada y estilos

**Files:**
- Create: `src/pages/Agenda.jsx`
- Create: `src/styles/agenda.css`
- Modify: `src/App.jsx` (ruta lazy)
- Modify: `src/pages/Casas.jsx` (botón "Agenda" en la barra)
- Modify: `src/index.css` (import de estilos)

**Interfaces:**
- Consumes: `listarCasas`, `listarProgramaciones`, `guardarProgramacion`, `borrarProgramacion` de `../lib/store.js`; `fechaLarga`, `hora`, `tz` de `../lib/formato.js`; `VENTANA`, `huecosLibres`, `primerChoque`, `mensajeChoque` de `../lib/disponibilidad.js`.
- Produces: ruta `/agenda` y botón de acceso desde el inicio.

- [ ] **Step 1: Crear la pantalla `Agenda.jsx`**

Create `src/pages/Agenda.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaretLeft, CaretRight, Plus, Trash, X } from '@phosphor-icons/react'
import { listarCasas, listarProgramaciones, guardarProgramacion, borrarProgramacion } from '../lib/store.js'
import { fechaLarga, hora, tz } from '../lib/formato.js'
import { VENTANA, huecosLibres, primerChoque, mensajeChoque } from '../lib/disponibilidad.js'
import Barra from '../components/Barra.jsx'
import Esqueleto from '../components/Esqueleto.jsx'

const OFFSET = '-03:00'
const ALTO_HORA = 56
const VALLE_INI = VENTANA.abre * 60
const VALLE_FIN = VENTANA.cierra * 60

const HOY = new Date().toLocaleDateString('en-CA', { timeZone: tz })
const diaDe = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz })
const minutos = (iso) => {
  const s = new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
const hhmm = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })
const aHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const sumarDias = (dia, n) => diaDe(new Date(new Date(`${dia}T12:00:00${OFFSET}`).getTime() + n * 864e5))
const isoEn = (dia, hhmm) => `${dia}T${hhmm}:00${OFFSET}`
const esPasado = (iso, ahora) => new Date(iso).getTime() < ahora
const recorte = (m) => Math.min(Math.max(m, VALLE_INI), VALLE_FIN)
const topDe = (m) => `${((recorte(m) - VALLE_INI) / 60) * ALTO_HORA}px`
const altoDe = (ini, fin) => `${Math.max(22, ((recorte(fin) - recorte(ini)) / 60) * ALTO_HORA)}px`
const HORAS = Array.from({ length: VENTANA.cierra - VENTANA.abre + 1 }, (_, i) => VENTANA.abre + i)

export default function Agenda() {
  const [dia, setDia] = useState(HOY)
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [errorForm, setErrorForm] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function cargar(d) {
    try {
      const [casas, bloques] = await Promise.all([
        listarCasas(),
        listarProgramaciones(`${d}T00:00:00${OFFSET}`, `${d}T23:59:59${OFFSET}`),
      ])
      setDatos({ casas, bloques, ahora: Date.now() })
      setError('')
    } catch (e) {
      setError(e.message || 'No se pudo cargar la agenda. Intentá de nuevo.')
    }
  }

  useEffect(() => {
    setDatos(null)
    cargar(dia)
  }, [dia])

  if (error)
    return <><Barra volver="/" titulo="Agenda" /><main className="pantalla"><p className="error" role="alert">{error}</p><button className="btn sec" style={{ marginTop: 12 }} onClick={() => cargar(dia)}>Reintentar</button></main></>

  if (!datos) return <><Barra volver="/" titulo="Agenda" /><Esqueleto filas={4} /></>

  const { casas, bloques, ahora } = datos
  const huecos = huecosLibres(bloques, dia)

  const nuevoEn = (hueco) => {
    if (!casas.length) return
    const ini = minutos(hueco.inicio)
    const fin = Math.min(ini + 60, minutos(hueco.fin))
    setErrorForm('')
    setForm({ casa_id: casas[0].id, dia, inicio: aHHMM(ini), fin: aHHMM(fin) })
  }

  const editar = (b) => {
    setErrorForm('')
    setForm({ id: b.id, casa_id: b.casa_id, dia, inicio: hhmm(b.inicio), fin: hhmm(b.fin) })
  }

  async function guardar(e) {
    e.preventDefault()
    setErrorForm('')
    if (!form.casa_id) return setErrorForm('Elegí una casa.')
    if (form.inicio >= form.fin) return setErrorForm('La hora de fin tiene que ser posterior a la de inicio.')
    const ini = isoEn(form.dia, form.inicio)
    const fin = isoEn(form.dia, form.fin)
    const otros = bloques.filter((b) => b.id !== form.id)
    const choque = primerChoque(otros, ini, fin)
    if (choque) {
      const casa = casas.find((c) => c.id === choque.casa_id)
      const libre = huecosLibres(otros, form.dia).find((g) => new Date(g.inicio) >= new Date(ini))
      return setErrorForm(`${mensajeChoque(casa?.nombre ?? 'otra casa', choque)}.${libre ? ` Podés a las ${hhmm(libre.inicio)}.` : ''}`)
    }
    setGuardando(true)
    try {
      await guardarProgramacion({ id: form.id, casa_id: form.casa_id, inicio: ini, fin: fin })
      setForm(null)
      if (form.dia !== dia) setDia(form.dia)
      else await cargar(dia)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function borrar() {
    if (!confirm('¿Borrar este bloque de la agenda?')) return
    setGuardando(true)
    try {
      await borrarProgramacion(form.id)
      setForm(null)
      await cargar(dia)
    } catch (err) {
      setErrorForm(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <Barra volver="/" titulo="Agenda" derecha={
        casas.length ? (
          <button className="btn chico" onClick={() => {
            setErrorForm('')
            if (huecos.length) nuevoEn(huecos[0])
            else setForm({ casa_id: casas[0].id, dia, inicio: '09:00', fin: '10:00' })
          }}><Plus size={16} weight="bold" /> Programar</button>
        ) : null
      } />
      <main className="pantalla">
        <div className="agenda-fecha">
          <button className="icono" aria-label="Día anterior" onClick={() => setDia(sumarDias(dia, -1))}><CaretLeft size={22} /></button>
          <div className="agenda-fecha-txt">
            <b>{fechaLarga(`${dia}T12:00:00${OFFSET}`)}</b>
            {dia !== HOY && <button type="button" className="link" onClick={() => setDia(HOY)}>Volver a hoy</button>}
          </div>
          <button className="icono" aria-label="Día siguiente" onClick={() => setDia(sumarDias(dia, 1))}><CaretRight size={22} /></button>
        </div>

        {!casas.length ? (
          <div className="bloque vacio">
            <h2>Primero cargá una casa</h2>
            <p>La agenda reparte los horarios entre tus casas.</p>
            <Link className="btn" to="/casa/nueva"><Plus size={18} weight="bold" /> Nueva casa</Link>
          </div>
        ) : (
          <div className="agenda-linea">
            {HORAS.map((h) => (
              <div className="agenda-hora" key={h} style={{ top: topDe(h * 60) }}>
                <span>{aHHMM(h * 60)}</span>
              </div>
            ))}
            {huecos.map((g) => (
              <button type="button" key={g.inicio} className="agenda-hueco"
                style={{ top: topDe(minutos(g.inicio)), height: altoDe(minutos(g.inicio), minutos(g.fin)) }}
                onClick={() => nuevoEn(g)}>
                Libre {hhmm(g.inicio)}–{hhmm(g.fin)}
              </button>
            ))}
            {bloques.map((b) => {
              const casa = casas.find((c) => c.id === b.casa_id)
              return (
                <button type="button" key={b.id}
                  className={`agenda-bloque ${esPasado(b.fin, ahora) ? 'pasado' : ''}`}
                  style={{ top: topDe(minutos(b.inicio)), height: altoDe(minutos(b.inicio), minutos(b.fin)) }}
                  onClick={() => editar(b)}>
                  <b>{casa?.nombre ?? 'Casa borrada'}</b>
                  <span>{hhmm(b.inicio)}–{hhmm(b.fin)}</span>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {form && (
        <div className="hoja-fondo" onClick={() => !guardando && setForm(null)}>
          <form className="hoja" onClick={(e) => e.stopPropagation()} onSubmit={guardar}>
            <div className="hoja-cabeza">
              <b>{form.id ? 'Cambiar el horario' : 'Programar una visita'}</b>
              <button type="button" className="icono" aria-label="Cerrar" onClick={() => setForm(null)}><X size={20} /></button>
            </div>
            <label>Casa
              <select value={form.casa_id} onChange={(e) => setForm({ ...form, casa_id: e.target.value })}>
                {casas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label>Fecha
              <input type="date" value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} required />
            </label>
            <div className="dos">
              <label>Desde<input type="time" min="06:00" max="23:00" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} required /></label>
              <label>Hasta<input type="time" min="06:00" max="23:00" value={form.fin} onChange={(e) => setForm({ ...form, fin: e.target.value })} required /></label>
            </div>
            {errorForm && <p className="error" role="alert">{errorForm}</p>}
            <button className="btn grande" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            {form.id && <button type="button" className="link peligro" onClick={borrar} disabled={guardando}><Trash size={16} /> Borrar este bloque</button>}
          </form>
        </div>
      )}
    </>
  )
}
```

Nota: `hora` se importa porque `mensajeChoque` ya lo usa internamente; en este archivo no se llama directo. Si oxlint marca el import sin uso, quitar `hora` de la lista de imports.

- [ ] **Step 2: Enchufar la ruta lazy en `App.jsx`**

Modify `src/App.jsx`. Agregar el lazy junto a los demás (después de la línea 15):

```js
const Agenda = lazy(() => import('./pages/Agenda.jsx'))
```

Y la ruta dentro de `<Routes>` de `Privado` (después de la línea 36):

```jsx
      <Route path="/agenda" element={<Agenda />} />
```

- [ ] **Step 3: Botón de entrada en el inicio (`Casas.jsx`)**

Modify `src/pages/Casas.jsx`. Agregar `CalendarBlank` al import de phosphor (línea 3):

```js
import { CalendarBlank, CaretRight, HouseLine, Info, PawPrint, Play, Plus, SignOut } from '@phosphor-icons/react'
```

Cambiar la definición de `barra` (línea 46-48) por:

```jsx
  const barra = (
    <Barra derecha={
      <>
        <Link to="/agenda" className="btn chico sec"><CalendarBlank size={16} weight="bold" /> Agenda</Link>
        <Link to="/casa/nueva" className="btn chico"><Plus size={16} weight="bold" /> Agregar casa</Link>
      </>
    } />
  )
```

- [ ] **Step 4: Crear los estilos**

Create `src/styles/agenda.css`:

```css
/* ---------- agenda ---------- */
.agenda-fecha { display: flex; align-items: center; gap: 8px; margin: 8px 0 16px; }
.agenda-fecha-txt { flex: 1; display: grid; justify-items: center; }
.agenda-fecha-txt b { font-size: var(--t-md); font-weight: 600; }
.agenda-fecha-txt .link { padding: 0; font-size: var(--t-xs); }

.agenda-linea { position: relative; height: 952px; margin: 8px 0 24px; }
.agenda-hora { position: absolute; left: 0; right: 0; height: 0; border-top: 1px solid var(--line); transform: translateY(-50%); }
.agenda-hora span { position: absolute; left: 0; top: -9px; width: 44px; font-family: var(--mono); font-size: var(--t-xs); color: var(--muted); background: var(--bg); }

.agenda-bloque, .agenda-hueco {
  position: absolute; left: 56px; right: 0; border: 0; border-radius: var(--r-field);
  padding: 6px 12px; text-align: left; display: grid; align-content: center; overflow: hidden;
}
.agenda-bloque { background: var(--primary); color: var(--on-primary); box-shadow: var(--shadow-sm); }
.agenda-bloque b { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.agenda-bloque span { font-family: var(--mono); font-size: var(--t-xs); opacity: .85; }
.agenda-bloque.pasado { background: var(--surface-2); color: var(--muted); box-shadow: inset 0 0 0 1px var(--line); }
.agenda-hueco { background: transparent; box-shadow: inset 0 0 0 1px var(--line); color: var(--muted); font-size: var(--t-xs); }
.agenda-hueco:hover { background: var(--primary-5); }

.hoja-fondo { position: fixed; inset: 0; z-index: 30; background: rgb(12 18 15 / .45); display: flex; align-items: flex-end; justify-content: center; }
.hoja {
  width: 100%; max-width: 560px; background: var(--surface);
  border-radius: var(--r) var(--r) 0 0; padding: 16px 16px max(16px, env(safe-area-inset-bottom));
  box-shadow: var(--shadow-up); display: grid; gap: 16px;
}
.hoja-cabeza { display: flex; align-items: center; justify-content: space-between; }
.hoja-cabeza b { font-size: var(--t-md); font-weight: 600; }
.hoja .link.peligro { justify-self: center; }
```

- [ ] **Step 5: Sumar el import al manifiesto**

Modify `src/index.css`. Agregar como última línea (después de `terminaciones.css`):

```css
@import './styles/agenda.css';
```

- [ ] **Step 6: Verificación completa**

Run: `npx oxlint`
Expected: exit 0, sin warnings (ojo con `new Date()` suelto en el render: todos los usos están en helpers de módulo, en `cargar` o en handlers).

Run: `npm test`
Expected: PASS — los 13 tests previos + `disponibilidad` + `programaciones`.

Run: `npm run build`
Expected: build OK; aparece un chunk nuevo `Agenda-*.js` y el chunk principal sigue por debajo de 500 kB.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/Agenda.jsx src/styles/agenda.css src/App.jsx src/pages/Casas.jsx src/index.css
git commit -m "feat: pantalla de agenda con línea de tiempo y disponibilidad"
```

---

### Task 5: Verificación final y nota de despliegue

**Files:**
- Modify: `docs/superpowers/specs/2026-10-08-agenda-disponibilidad-design.md` (marcar estado aprobado) — opcional.

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: app verificada y checklist de despliegue para la usuaria.

- [ ] **Step 1: Correr la batería completa**

Run: `npx oxlint && npm test && npm run build`
Expected: los tres exit 0, sin warnings.

- [ ] **Step 2: Probar a mano en modo demo (dev)**

Run: `npm run dev`
Probar, en este orden:
1. Inicio → botón "Agenda" → se abre la Agenda del día.
2. Tocar un hueco "Libre" → el formulario se abre con horas prellenadas → Guardar → el bloque aparece en la línea.
3. Tocar "+ Programar" → cargar un horario que pise el bloque anterior → aparece el aviso con la casa y el próximo hueco libre; no deja guardar.
4. Tocar el bloque → cambiar la hora de fin → guarda. Tocar de nuevo → Borrar.
5. Cambiar de día con las flechas y volver con "Volver a hoy".

- [ ] **Step 3: Dejar la nota de despliegue en el resumen al usuario**

Mensaje a incluir en la respuesta final: para que la agenda funcione en producción (Supabase), hay que pegar el bloque SQL nuevo de `supabase/schema.sql` (la tabla `programaciones` + sus políticas) en Supabase → SQL Editor → New query → Run, una sola vez.

- [ ] **Step 4: Commit final (si hubo cambios de docs)**

```powershell
git add -A
git commit -m "docs: spec de agenda aprobado y verificado"
```

---

## Self-Review

**1. Cobertura del spec:**
- §1 Datos y backend → Task 2 (demo), Task 3 (schema + Supabase + fachada). ✓
- §2 `disponibilidad.js` → Task 1. ✓
- §3 Pantalla, entrada, ruta, estilos → Task 4. ✓
- §4 Errores (listar → mensaje + reintentar; guardar → inline; solape; cascada) → Task 4 (UI) + Task 2 (cascada). ✓
- §5 Tests → Task 1 y Task 2. ✓
- §6 Orden → numeración de tasks. ✓
- §7 Despliegue → Task 5 Step 3. ✓

**2. Placeholders:** ninguno; todas las tasks tienen código concreto y comandos con salida esperada.

**3. Consistencia de tipos:** las tres funciones de backend tienen la misma firma en demo (Task 2) y Supabase (Task 3) y los mismos nombres re-exportados en la fachada (Task 3), que es lo que consume `Agenda.jsx` (Task 4). `huecosLibres` siempre devuelve `{ inicio, fin }` ISO; `mensajeChoque(nombre, bloque)` recibe el bloque crudo. ✓

**4. Review Focus:** las cinco clases de entrada tienen test en la task dueña (1: recorte/borde/desordenados; 2: mover sin autocconflicto y cascada). ✓
