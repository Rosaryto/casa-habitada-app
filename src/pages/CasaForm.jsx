import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { obtenerCasa, guardarCasa, borrarCasa, subirFoto } from '../lib/store.js'
import { CaretDown, Camera, HouseLine, Plus, X } from '@phosphor-icons/react'
import { CHECKLIST_BASE, PLANES } from '../config.js'
import { numeroWhatsApp } from '../lib/formato.js'
import Esqueleto from '../components/Esqueleto.jsx'
import Barra from '../components/Barra.jsx'

// Frecuencia de cada plan, para elegirlo tocando.
const DETALLE_PLAN = {
  'Visita suelta': 'Cuando la pidan',
  'Plan Tranquilo': '1 visita por semana',
  'Plan Presente': '3 visitas por semana',
  'Plan Compañía': 'Todos los días, con mascotas',
  'Plan Turno Minero': 'Durante el turno, 3 por semana',
  'Plan Turno Minero con mascotas': 'Durante el turno, todos los días',
}

const VACIA = {
  nombre: '',
  dueno_nombre: '',
  dueno_telefono: '',
  direccion: '',
  plan: 'Plan Presente',
  mascotas: '',
  notas: '',
  checklist: CHECKLIST_BASE,
}

// Foto de portada de la casa: se ve en la lista, en la portada y en el informe del dueño.
function FotoCasa({ foto, onCambiar }) {
  const ref = useRef()
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  async function elegir(e) {
    const archivo = e.target.files[0]
    e.target.value = ''
    if (!archivo) return
    setSubiendo(true)
    setError('')
    try {
      onCambiar(await subirFoto(archivo))
    } catch (err) {
      setError(err.message || 'No se pudo subir la foto')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="foto-casa">
      <button type="button" className={`foto-casa-marco ${subiendo ? 'subiendo' : ''}`} onClick={() => ref.current.click()} disabled={subiendo}>
        {foto ? <img src={foto} alt="Foto de la casa" /> : <span className="foto-casa-vacia"><HouseLine size={36} /></span>}
        <span className="foto-casa-boton"><Camera size={18} weight="bold" /> {subiendo ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Agregar foto de la casa'}</span>
      </button>
      <input ref={ref} type="file" accept="image/*" hidden onChange={elegir} />
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}

export default function CasaForm() {
  const { id } = useParams()
  const navegar = useNavigate()
  const [casa, setCasa] = useState(id ? null : VACIA)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [verLista, setVerLista] = useState(false)

  useEffect(() => {
    if (id)
      obtenerCasa(id)
        .then((c) => (c ? setCasa(c) : setError('No se encontró esta casa. Puede que se haya borrado.')))
        .catch((e) => setError(e.message))
  }, [id])

  const volver = id ? `/casa/${id}` : '/'
  const titulo = id ? 'Editar casa' : 'Nueva casa'
  if (error && !casa) return <><Barra volver={volver} titulo={titulo} /><main className="pantalla"><p className="error" role="alert">{error}</p></main></>
  if (!casa) return <><Barra volver={volver} titulo={titulo} /><Esqueleto filas={4} /></>

  const campo = (k) => ({ value: casa[k] ?? '', onChange: (e) => setCasa({ ...casa, [k]: e.target.value }) })

  const setChecklist = (fn) => setCasa((c) => ({ ...c, checklist: fn(structuredClone(c.checklist)) }))

  async function enviar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const checklist = casa.checklist
        .map((s) => ({ seccion: s.seccion.trim(), items: s.items.map((i) => i.trim()).filter(Boolean) }))
        .filter((s) => s.seccion && s.items.length)
      const dueno_telefono = casa.dueno_telefono?.trim() ? numeroWhatsApp(casa.dueno_telefono) : ''
      const guardada = await guardarCasa({ ...casa, dueno_telefono, checklist })
      navegar(`/casa/${guardada.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar "${casa.nombre}" y todas sus visitas? No se puede deshacer.`)) return
    setError('')
    try {
      await borrarCasa(id)
      navegar('/', { replace: true })
    } catch (e) {
      setError(e.message || 'No se pudo borrar la casa. Probá de nuevo.')
    }
  }

  return (
    <form onSubmit={enviar}>
      <Barra volver={volver} titulo={titulo} />
      <main className="pantalla con-pie">
        <FotoCasa foto={casa.foto} onCambiar={(foto) => setCasa((c) => ({ ...c, foto }))} />

        <h2 className="sec-titulo paso"><span>1</span> La casa</h2>
        <div className="bloque form">
          <label>Nombre de la casa<input {...campo('nombre')} required placeholder="Casa Fernández" /><span className="ayuda">Como la vas a reconocer en la lista. Solo esto es obligatorio.</span></label>
          <label>Dirección o barrio<input {...campo('direccion')} placeholder="Vaqueros, lote 12" /></label>
        </div>

        <h2 className="sec-titulo paso"><span>2</span> El dueño</h2>
        <div className="bloque form">
          <label>Nombre<input {...campo('dueno_nombre')} placeholder="Laura Fernández" /></label>
          <label>WhatsApp<input {...campo('dueno_telefono')} inputMode="tel" placeholder="387 555 1234" /><span className="ayuda">Escribilo como siempre, con la característica. Sirve para mandarle los informes.</span></label>
        </div>

        <h2 className="sec-titulo paso"><span>3</span> Mascotas</h2>
        <div className="bloque form">
          <label>¿Qué mascotas hay?<input {...campo('mascotas')} placeholder="Toto (labrador) y Luna (gata)" /><span className="ayuda">Si no hay, dejalo vacío. Si hay, la visita es todos los días.</span></label>
        </div>

        <h2 className="sec-titulo paso"><span>4</span> Plan contratado</h2>
        <p className="ayuda-sec">Define cada cuántos días te toca ir. La app te avisa en el inicio.</p>
        <div className="planes-opciones" role="radiogroup" aria-label="Plan">
          {PLANES.map((p) => (
            <button key={p} type="button" role="radio" aria-checked={casa.plan === p}
              className={`plan-opcion ${casa.plan === p ? 'activo' : ''}`} onClick={() => setCasa({ ...casa, plan: p })}>
              <b>{p.replace('Plan ', '')}</b>
              <span>{DETALLE_PLAN[p]}</span>
            </button>
          ))}
        </div>

        <h2 className="sec-titulo paso"><span>5</span> Notas para vos</h2>
        <div className="bloque form">
          <label>Notas<textarea {...campo('notas')} rows={3} placeholder="Dónde está la llave, código de alarma, teléfono del piletero…" /><span className="ayuda">El dueño no las ve.</span></label>
        </div>

        <h2 className="sec-titulo paso"><span>6</span> Qué revisar en cada visita</h2>
        <p className="ayuda-sec">Ya viene armada con la lista de siempre ({casa.checklist.reduce((n, s) => n + s.items.length, 0)} puntos). Cambiala solo si esta casa tiene algo distinto.</p>
        {!verLista ? (
          <button type="button" className="btn sec ancho" onClick={() => setVerLista(true)}><CaretDown size={18} /> Ver o cambiar la lista</button>
        ) : (
          <>
            {casa.checklist.map((s, si) => (
              <div className="bloque lista-edit" key={si}>
                <div className="fila-input">
                  <input className="seccion" value={s.seccion} placeholder="Nombre del grupo, por ejemplo Exterior" aria-label="Nombre del grupo"
                    onChange={(e) => setChecklist((c) => { c[si].seccion = e.target.value; return c })} />
                  <button type="button" className="icono" aria-label="Quitar este grupo entero"
                    onClick={() => setChecklist((c) => c.filter((_, i) => i !== si))}><X size={18} /></button>
                </div>
                {s.items.map((it, ii) => (
                  <div className="fila-input" key={ii}>
                    <input value={it} placeholder="Qué revisar" aria-label="Punto a revisar"
                      onChange={(e) => setChecklist((c) => { c[si].items[ii] = e.target.value; return c })} />
                    <button type="button" className="icono" aria-label="Quitar este punto"
                      onClick={() => setChecklist((c) => { c[si].items.splice(ii, 1); return c })}><X size={16} /></button>
                  </div>
                ))}
                <button type="button" className="link" style={{ justifySelf: 'start' }}
                  onClick={() => setChecklist((c) => { c[si].items.push(''); return c })}><Plus size={16} /> Agregar un punto acá</button>
              </div>
            ))}
            <p className="ayuda-sec" style={{ marginTop: 8 }}>La cruz de cada renglón lo borra.</p>
            <button type="button" className="btn sec ancho" style={{ marginTop: 4 }}
              onClick={() => setChecklist((c) => [...c, { seccion: '', items: [''] }])}><Plus size={18} /> Agregar un grupo nuevo</button>
          </>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        {id && <div style={{ textAlign: 'center', marginTop: 32 }}><button type="button" className="link peligro" onClick={borrar}>Borrar esta casa</button></div>}
      </main>
      <div className="pie-fijo">
        <button className="btn grande" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar casa'}</button>
      </div>
    </form>
  )
}
