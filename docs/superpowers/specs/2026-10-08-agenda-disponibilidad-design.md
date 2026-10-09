# Spec: Agenda con bloques de horarios y disponibilidad

Fecha: 2026-10-08
Estado: pendiente de aprobación del usuario

## Contexto y objetivo

Casa Habitada registra visitas hechas (nacen al apretar "Empezar visita") y calcula "te toca hoy" a partir de los planes de cada casa. No existe forma de planificar: la usuaria quiere saber, antes de agendar una casa, qué horarios ya están ocupados ese día.

Objetivo: una pantalla **Agenda** donde se cargan bloques `{casa, inicio, fin}` por día, se ven los huecos libres de un vistazo, y el sistema **bloquea con dureza** cualquier bloque que pise a otro.

Decisiones ya tomadas con la usuaria:

- Se bloquea por **franja horaria** (no por día completo).
- La duración la elige ella a mano cada vez (inicio y fin); no se valida duración mínima.
- Camino A: los bloques viven en su **propia tabla** (`programaciones`), separados de `visitas`. Historial, planes, informe del dueño y RLS existentes quedan intactos.

## Alcance fuera (explícito)

- Notificaciones/recordatorios.
- Autogenerar bloques desde los planes ("te toca hoy").
- Que el dueño vea la agenda en su informe público.
- Vinculación automática bloque ↔ visita real.
- Bloques que crucen la medianoche (el formulario solo admite 06:00–23:00 del mismo día).

## 1. Datos y backend

### Tabla (se agrega a `supabase/schema.sql`)

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

Sin columna de estado: un bloque pasado se ve apagado por fecha sola; se edita o borra a mano. Borrar una casa arrastra sus bloques (`on delete cascade`, igual que visitas).

### API (3 métodos nuevos en la fachada `src/lib/store.js`, implementados en `demo.js` y `supabase.js`)

- `listarProgramaciones(desde, hasta)` — recibe ISO, devuelve bloques ordenados por `inicio`.
- `guardarProgramacion({ id?, casa_id, inicio, fin })` — crea o mueve. **Revalida el solape contra los bloques existentes del día antes de escribir**; si hay conflicto, lanza error con mensaje apto para mostrar ("La Casa Los Álamos ya ocupa de 9:00 a 11:00"). Devuelve el registro guardado.
- `borrarProgramacion(id)`.

Modo demo: se guardan en la misma base de `localStorage` (`casa-habitada-demo`), con validación de solape idéntica usando la misma lógica pura (ver §2). `borrarCasa` en demo debe filtrar también sus `programaciones`.

Modo Supabase: consultas a `.from('programaciones')`, con `order('inicio')` y filtro por rango de `inicio`.

## 2. Lógica de disponibilidad — `src/lib/disponibilidad.js` (nuevo, puro)

Funciones puras, sin acceso a red ni storage (se testean con `node --test`):

- `haySolape(bloques, inicio, fin)` → booleano. Solape estricto: `a.inicio < b.fin && b.inicio < a.fin`. Los bloques que se tocan en el borde (fin 11:00 / inicio 11:00) **no** pisan.
- `huecosLibres(bloques, dia)` → `[{ inicio, fin }]` (ISO). `dia` es fecha local `'YYYY-MM-DD'` en `America/Argentina/Salta`; la ventana es 06:00–23:00 de ese día. Recorta los bloques a la ventana, los ordena y devuelve los intersticios. Día vacío ⇒ un solo hueco de 06:00 a 23:00.

No se toca `agenda.js` (que sigue con `estadoCasa`/`haceCuanto`/`saludo`).

## 3. Pantalla — `src/pages/Agenda.jsx` (nuevo)

- **Acceso:** botón "Agenda" en el encabezado de la pantalla de inicio (`Casas.jsx`), junto a los accesos existentes.
- **Ruta:** `/agenda` en `App.jsx` con `React.lazy` + `Suspense` (como las demás).
- **Vista:** un día a la vez, línea de tiempo vertical de 06:00 a 23:00. La pantalla lista los bloques del día completo (00:00–24:00 de `dia` en Salta) y dibuja solo la ventana 06:00–23:00.
  - Encabezado: `← fecha →` (formato con `fechaLarga` de `formato.js`) + botón "Hoy".
  - Bloques posicionados y con altura según su horario; muestran nombre de la casa y `"9:00–11:00"` (`hora()` de `formato.js`).
  - Bloques con `fin < ahora` se pintan apagados (clase `pasado`), siguen siendo editables/borrables.
  - Huecos libres mostrados con `"+ libre 11:00–14:00 +"`; **tocar un hueco** abre el formulario con fecha y horas prellenadas (inicio = inicio del hueco, fin = inicio + 1 h, limitado al fin del hueco).
  - Botón **"+ Programar"** para agendar desde cero.
  - Día vacío: "No queda nada programado para este día" + botón para agregar.
- **Formulario** (misma pieza para crear y editar): selector de casa, fecha, hora inicio, hora fin. El horario permitido es 06:00–23:00 del mismo día.
- **Validación en la UI (además de la del backend):**
  - fin ≤ inicio → "La hora de fin tiene que ser posterior a la de inicio".
  - solape → "La Casa X ya ocupa de 9:00 a 11:00" + sugerencia "podés a las 11:00" (primer hueco libre que empieza en o después de la hora pedida). No deja guardar. Al editar un bloque, ese propio bloque no cuenta como conflicto.
- **Tocar un bloque existente** abre el mismo formulario con opciones **editar** y **borrar**.
- **Estilos:** `src/styles/agenda.css` nuevo, agregado como último `@import` del manifiesto `src/index.css` (el orden actual no cambia). Sigue los tokens existentes (`tokens.css`).

## 4. Manejo de errores

- Fallo al listar → mensaje cortés en la pantalla ("No se pudo cargar la agenda. Intentá de nuevo.") con botón de reintentar; nunca esqueleto infinito (mismo criterio aplicado a las pantallas de casa).
- Fallo al guardar → mensaje inline en el formulario; el form conserva lo cargado.
- Conflicto de solape detectado por el backend (carrera entre dos sesiones) → se muestra como cualquier otro solape.
- Borrar la casa desde otra pantalla → sus bloques desaparecen (Supabase en cascada; demo filtra al borrar).

## 5. Tests (`npm test`, runner nativo)

- `test/disponibilidad.test.js`:
  - borde exacto no pisa (fin 11:00 / inicio 11:00 libre);
  - solape parcial y total;
  - `huecosLibres` de día vacío (06:00–23:00 completo);
  - día con bloques desordenados → huecos ordenados y recortados;
  - bloque al inicio (desde 06:00) y al final (hasta 23:00) → huecos sin extremos;
  - hora de fin inválida.
- `test/programaciones.test.js`: CRUD del modo demo con `localStorage` falso (guardar, mover, borrar, listar por rango, rechazo de solape al guardar).

## 6. Orden de implementación

1. `src/lib/disponibilidad.js` + `test/disponibilidad.test.js` (verde antes de seguir).
2. Backend: `schema.sql`, `demo.js`, `supabase.js`, fachada `store.js` + `test/programaciones.test.js`.
3. `pages/Agenda.jsx`, ruta lazy en `App.jsx`, botón en `Casas.jsx`, `styles/agenda.css`.
4. Verificación final: `npx oxlint && npm test && npm run build`.

## 7. Para desplegar

La usuaria debe pegar el bloque SQL de §1 en Supabase → SQL Editor → New query → Run (una sola vez, junto al resto del esquema ya cargado).
