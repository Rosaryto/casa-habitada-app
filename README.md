# Casa Habitada · App de informes

[![CI](https://github.com/Rosaryto/casa-habitada-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Rosaryto/casa-habitada-app/actions/workflows/ci.yml)

Aplicación web para el servicio de cuidado de casas **Casa Habitada**. Permite
registrar cada visita con una lista de control y fotos, y ofrece a cada
propietario un informe online mediante un enlace privado.

La app de informes es la pieza interna del negocio: la usa la persona a cargo
de las casas, mientras que los dueños solo reciben un enlace de lectura.

El acceso está restringido a cuentas autorizadas: no hay registro público ni
entrada sin inicio de sesión.

**En producción:** <https://casa-habitada-salta.netlify.app> (requiere inicio de
sesión con un correo autorizado).

**Demo pública:** <https://casa-habitada-salta.netlify.app/?demo> (o el enlace
"Ver una demo" en la pantalla de login). Corre con datos de ejemplo en el
navegador del visitante y **no se conecta a la base real**.

---

## Características

- **Gestión de casas.** Alta, edición y baja, con datos del propietario, plan
  contratado, mascotas y notas internas (que el dueño no ve).
- **Visitas guiadas.** Lista de control por secciones con tres estados por ítem
  (Bien / Novedad / No aplica), notas y fotos. Cronómetro de entrada y salida, y
  recuperación del progreso si se cierra el navegador.
- **Informe para el dueño.** Cada casa tiene un enlace único e irrepetible que se
  comparte solo con el propietario. Muestra la última visita, el historial del
  mes, las novedades y todas las fotos.
- **Agenda de turnos.** Bloques de horario programados por casa, con detección de
  solapes para no agendar dos casas en el mismo momento.
- **Planes con frecuencia.** La pantalla de inicio calcula cuándo toca visitar
  cada casa según su plan (diario, cada dos días o semanal).
- **Modo demo.** Una demo pública con datos de ejemplo que corre solo en el
  navegador (se entra con `?demo` o con el enlace "Ver una demo" del login). No
  accede a la base de datos real.

## Tecnologías

| Área | Herramientas |
|---|---|
| Interfaz | React 19, React Router 7 (HashRouter) |
| Build | Vite 8 |
| Datos y autenticación | Supabase (Postgres + Storage + Auth) |
| Estilos | CSS propio con variables de diseño |
| Íconos y tipografías | Phosphor Icons, Geist / Geist Mono (`@fontsource`) |
| Calidad | oxlint y `node --test` |
| Gestor de paquetes | pnpm |

## Requisitos

- **Node.js 24** o superior
- **pnpm 11** o superior

## Puesta en marcha

```bash
pnpm install
pnpm dev
```

El acceso a la app es siempre con **inicio de sesión** de un correo autorizado.
No existe registro público: las cuentas se crean desde el panel de administración
(Supabase → *Authentication → Users*). Sin las variables de entorno de Supabase
la app no se conecta a ningún dato real.

## Configuración

Para usar la app con datos reales hacen falta las credenciales de un proyecto de
Supabase.

1. Copiá `.env.example` como `.env`.
2. Completá las variables con los datos de tu proyecto
   (Supabase → *Project Settings → API*):

   ```dotenv
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
   ```

3. Aplicá el esquema de la base de datos (ver más abajo).

La clave `anon` es pública por diseño: la seguridad la garantizan las políticas
de Row Level Security definidas en el esquema. La clave secreta (`service_role`)
nunca debe incluirse en la app.

### Base de datos

- `supabase/schema.sql` — esquema completo (tablas, políticas, informe del dueño
  y bucket de fotos). Se pega una sola vez, en Supabase → **SQL Editor**.
- `supabase/agenda.sql` — bloque incremental que agrega la tabla `programaciones`
  de la agenda, para bases que ya tenían el resto del esquema aplicado.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo con recarga en caliente |
| `pnpm build` | Genera el sitio de producción en `dist/` |
| `pnpm preview` | Sirve localmente el resultado del build |
| `pnpm lint` | Analiza el código con oxlint |
| `pnpm test` | Ejecuta las pruebas con `node --test` |

## Estructura del proyecto

```
app/
├── public/              Archivos estáticos (íconos, manifest)
├── src/
│   ├── components/      Componentes reutilizables
│   ├── lib/             Lógica y acceso a datos (store, supabase, agenda…)
│   ├── pages/           Pantallas de la aplicación
│   ├── styles/          Hojas de estilo y variables de diseño
│   ├── App.jsx          Rutas y control de sesión
│   ├── config.js        Marca, WhatsApp, planes y lista de control base
│   └── main.jsx         Punto de entrada
├── supabase/            Esquema SQL de la base de datos
├── test/                Pruebas unitarias
└── netlify.toml         Configuración de despliegue
```

La lógica de datos se centraliza en `src/lib/store.js`, que elige el backend
según la configuración: Supabase cuando hay credenciales o almacenamiento local
para desarrollo. Esto mantiene las pantallas ajenas al origen de los datos.

## Integración continua

El flujo `.github/workflows/ci.yml` corre en cada push y pull request, y ejecuta
sobre Node 24 con pnpm: instalación reproducible (`--frozen-lockfile`), lint,
tests y build.

## Despliegue

El proyecto está enlazado a Netlify y publica automáticamente: cada push a la
rama `master` dispara un build y un despliegue a producción.

**Sitio en producción:** <https://casa-habitada-salta.netlify.app> (requiere
inicio de sesión con un correo autorizado).

- Comando de build: `pnpm run build`
- Directorio publicado: `dist/`

Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` deben estar
cargadas en Netlify (*Site configuration → Environment variables*) para que el
build se conecte a la base de datos.

También se puede desplegar manualmente:

```bash
pnpm build
# subir el contenido de dist/ a Netlify
```

## Privacidad y seguridad

- El acceso a los datos reales está restringido a cuentas autorizadas. El
  registro público está deshabilitado y no se puede entrar a la base sin iniciar
  sesión. El modo demo no accede a datos reales.
- Las políticas de Row Level Security aíslan los datos: cada cuenta ve y edita
  únicamente sus propias casas y visitas.
- Cada casa tiene un enlace único e imposible de adivinar que se comparte solo con
  su dueño. Ese enlace expone únicamente el nombre y la dirección de la casa con
  sus visitas; las notas internas y los teléfonos nunca salen ahí.
- Las fotos se almacenan con nombres aleatorios en un bucket público. Se
  recomienda no fotografiar códigos de alarma ni llaves.

## Personalización

El nombre de marca, el WhatsApp, el remitente del informe, los planes y la lista
de control base se editan en `src/config.js`.

---

Proyecto privado de Casa Habitada. Todos los derechos reservados.
