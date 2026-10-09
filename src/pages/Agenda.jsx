import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaretLeft, CaretRight, Plus, Trash, X } from '@phosphor-icons/react'
import { listarCasas, listarProgramaciones, guardarProgramacion, borrarProgramacion } from '../lib/store.js'
import { fechaLarga, tz } from '../lib/formato.js'
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
  const [vista, setVista] = useState(null)
  const [form, setForm] = useState(null)
  const [errorForm, setErrorForm] = useState('')
  const [guardando, setGuardando] = useState(false)

  const traer = (d) => Promise.all([
    listarCasas(),
    listarProgramaciones(`${d}T00:00:00${OFFSET}`, `${d}T23:59:59${OFFSET}`),
  ]).then(([casas, bloques]) => ({ casas, bloques }))

  async function cargar(d) {
    try {
      const { casas, bloques } = await traer(d)
      setVista({ dia: d, casas, bloques, ahora: Date.now() })
    } catch (e) {
      setVista({ dia: d, error: e.message || 'No se pudo cargar la agenda. Intentá de nuevo.' })
    }
  }

  useEffect(() => {
    let vivo = true
    traer(dia)
      .then(({ casas, bloques }) => vivo && setVista({ dia, casas, bloques, ahora: Date.now() }))
      .catch((e) => vivo && setVista({ dia, error: e.message || 'No se pudo cargar la agenda. Intentá de nuevo.' }))
    return () => { vivo = false }
  }, [dia])

  const alDia = vista && vista.dia === dia ? vista : null

  if (alDia?.error)
    return <><Barra volver="/" titulo="Agenda" /><main className="pantalla"><p className="error" role="alert">{alDia.error}</p><button className="btn sec" style={{ marginTop: 12 }} onClick={() => cargar(dia)}>Reintentar</button></main></>

  if (!alDia) return <><Barra volver="/" titulo="Agenda" /><Esqueleto filas={4} /></>

  const { casas, bloques, ahora } = alDia
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
