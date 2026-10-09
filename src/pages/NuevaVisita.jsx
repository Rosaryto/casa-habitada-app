import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, Checks, Copy, Minus, PawPrint, WarningCircle, WhatsappLogo } from '@phosphor-icons/react'
import { obtenerCasa, guardarVisita } from '../lib/store.js'
import { hora, duracion, linkInforme, linkWhatsApp, novedades } from '../lib/formato.js'
import { A_CARGO, MARCA, SECCIONES_VISITA_CORTA } from '../config.js'
import { Fotos } from '../components/VisitaDetalle.jsx'
import Anillo from '../components/Anillo.jsx'
import BotonFoto from '../components/BotonFoto.jsx'
import Cronometro from '../components/Cronometro.jsx'
import Festejo from '../components/Festejo.jsx'
import Esqueleto from '../components/Esqueleto.jsx'
import Barra from '../components/Barra.jsx'

const ESTADOS = [
  ['ok', 'Bien', Check],
  ['novedad', 'Problema', WarningCircle],
  ['na', 'No hay', Minus],
]

// Visita completa: toda la lista. Visita corta: solo mascotas y lo básico de la casa
// (para los días que no toca la completa en los planes con visita diaria).
const TIPOS = [
  ['completa', 'Toda la casa'],
  ['mascotas', 'Solo mascotas'],
]

const tieneMascotas = (casa) => Boolean(casa.mascotas?.trim())

function nuevoBorrador(casa, tipo = 'completa') {
  const corta = casa.checklist.filter((s) => SECCIONES_VISITA_CORTA.includes(s.seccion))
  const secciones = tipo === 'mascotas' && corta.length ? corta : casa.checklist
  return {
    tipo,
    inicio: new Date().toISOString(),
    notas: '',
    fotos: [],
    items: secciones.flatMap((s) =>
      s.items.map((texto) => ({ seccion: s.seccion, texto, estado: null, nota: '', fotos: [] })),
    ),
  }
}

export default function NuevaVisita() {
  const { id } = useParams()
  const clave = `borrador-visita-${id}`
  const [casa, setCasa] = useState(null)
  const [v, setV] = useState(null)
  const [guardada, setGuardada] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')
  const [guiaVista, setGuiaVista] = useState(() => { try { return localStorage.getItem('guia-visita-vista') === '1' } catch { return false } })

  useEffect(() => {
    obtenerCasa(id).then((c) => {
      if (!c) {
        setError('No se encontró esta casa. Puede que se haya borrado.')
        return
      }
      setCasa(c)
      let borrador = null
      try { borrador = JSON.parse(localStorage.getItem(clave)) } catch { /* sin borrador */ }
      setV(borrador ?? nuevoBorrador(c))
    }).catch((e) => setError(e.message))
  }, [id, clave])

  // Guarda un borrador por si se cierra el navegador en medio de la visita.
  useEffect(() => {
    if (!v || guardada) return
    try { localStorage.setItem(clave, JSON.stringify(v)) } catch { /* sin espacio: seguimos igual */ }
  }, [v, clave, guardada])

  if (error && !casa) return <><Barra volver={`/casa/${id}`} /><main className="pantalla"><p className="error" role="alert">{error}</p></main></>
  if (!casa || !v) return <><Barra volver={`/casa/${id}`} /><Esqueleto filas={4} /></>

  const tipo = v.tipo ?? 'completa'
  const setItem = (n, cambios) =>
    setV((x) => ({ ...x, items: x.items.map((it, i) => (i === n ? { ...it, ...cambios } : it)) }))
  const todoBien = (seccion) =>
    setV((x) => ({ ...x, items: x.items.map((it) => (it.seccion === seccion && !it.estado ? { ...it, estado: 'ok' } : it)) }))

  const hechos = v.items.filter((i) => i.estado).length
  const total = v.items.length

  function cambiarTipo(t) {
    if (t === tipo) return
    if (hechos && !confirm('Cambiar el tipo de visita borra lo que marcaste. ¿Seguimos?')) return
    setV({ ...nuevoBorrador(casa, t), inicio: v.inicio })
  }

  async function terminar() {
    const pendientes = total - hechos
    if (pendientes && !confirm(`Te ${pendientes === 1 ? 'falta 1 punto' : `faltan ${pendientes} puntos`} por marcar. Si terminás igual, quedan como "No hay". ¿Terminar la visita?`)) return
    setGuardando(true)
    setError('')
    try {
      const visita = await guardarVisita({
        casa_id: id,
        tipo,
        inicio: v.inicio,
        fin: new Date().toISOString(),
        notas: v.notas.trim(),
        fotos: v.fotos,
        items: v.items.map((i) => ({ ...i, estado: i.estado ?? 'na', nota: i.nota.trim() })),
      })
      localStorage.removeItem(clave)
      setGuardada(visita)
      window.scrollTo(0, 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  function descartar() {
    if (!confirm('¿Descartar esta visita? Se pierde lo que marcaste.')) return
    localStorage.removeItem(clave)
    setV(nuevoBorrador(casa, tipo))
  }

  // ---------- Visita terminada ----------
  if (guardada) {
    const nov = novedades(guardada)
    const fotos = guardada.fotos.length + guardada.items.reduce((n, i) => n + i.fotos.length, 0)
    const revisados = guardada.items.filter((i) => i.estado !== 'na').length
    const nombre = casa.dueno_nombre?.split(' ')[0]
    const hola = nombre ? `Hola ${nombre}!` : 'Hola!'
    const texto = [
      guardada.tipo === 'mascotas'
        ? `${hola} Hoy pasé a ver a las mascotas, de ${hora(guardada.inicio)} a ${hora(guardada.fin)}.`
        : `${hola} Terminé la visita completa de hoy a tu casa, de ${hora(guardada.inicio)} a ${hora(guardada.fin)}.`,
      nov.length
        ? `Novedades:\n${nov.map((i) => `• ${i.seccion}: ${i.nota || i.texto}`).join('\n')}`
        : 'Todo en orden.',
      guardada.notas,
      `Informe completo con fotos: ${linkInforme(casa.token)}`,
      A_CARGO ? `${A_CARGO} · ${MARCA}` : MARCA,
    ].filter(Boolean).join('\n\n')

    async function copiar() {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    }

    return (
      <>
        <Barra volver={`/casa/${id}`} titulo={casa.nombre} />
        <main className="pantalla con-pie terminada">
          <Festejo />
          <h1>{nov.length ? 'Visita terminada' : '¡Todo en orden!'}</h1>
          <p>{guardada.tipo === 'mascotas' ? 'Visita de mascotas' : 'Visita completa'}, de <span className="mono">{hora(guardada.inicio)}</span> a <span className="mono">{hora(guardada.fin)}</span></p>

          <div className="resumen-visita">
            <div className="stat"><b>{duracion(guardada.inicio, guardada.fin)}</b><span>duración</span></div>
            <div className="stat"><b>{revisados}</b><span>revisados</span></div>
            <div className={`stat ${nov.length ? 'alerta' : ''}`}><b>{nov.length}</b><span>{nov.length === 1 ? 'problema' : 'problemas'}</span></div>
            <div className="stat"><b>{fotos}</b><span>fotos</span></div>
          </div>

          <p className="para-quien">{nombre ? `Este es el mensaje para ${nombre}. Mandalo con el botón verde de abajo.` : 'Este es el mensaje para el dueño. Copialo con el botón de abajo y mandáselo.'}</p>
          <div className="chat"><pre className="burbuja">{texto}</pre></div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/" className="link">Volver al inicio</Link>
          </div>
        </main>
        <div className="pie-fijo">
          {casa.dueno_telefono ? (
            <a className="btn wa grande" href={linkWhatsApp(casa.dueno_telefono, texto)} target="_blank" rel="noopener">
              <WhatsappLogo size={22} weight="fill" /> Mandar por WhatsApp
            </a>
          ) : (
            <button className="btn grande" onClick={copiar}>
              {copiado ? <><Check size={20} weight="bold" /> Copiado</> : <><Copy size={20} /> Copiar mensaje</>}
            </button>
          )}
        </div>
      </>
    )
  }

  // ---------- Visita en curso ----------
  const secciones = []
  v.items.forEach((it, n) => {
    const ultima = secciones.at(-1)
    if (ultima?.nombre === it.seccion) ultima.items.push([it, n])
    else secciones.push({ nombre: it.seccion, items: [[it, n]] })
  })

  return (
    <>
      <Barra volver={`/casa/${id}`} titulo={casa.nombre} subtitulo="Visita en curso" derecha={<Cronometro desde={v.inicio} />} />
      <main className="pantalla con-pie">
        {guiaVista ? (
          <button type="button" className="link guia-abrir" onClick={() => setGuiaVista(false)}>¿Cómo se hace una visita?</button>
        ) : (
        <div className="guia">
          <b>Cómo se hace</b>
          <ol>
            <li>Revisá cada punto y marcá <b>Bien</b>, <b>Problema</b> o <b>No hay</b> (si esa casa no lo tiene).</li>
            <li>Si marcás Problema, escribí qué pasó. Si querés, sacá una foto.</li>
            <li>Al final tocá el botón verde de abajo, <b>Terminar visita</b>, y se arma el mensaje para el dueño.</li>
          </ol>
          <button type="button" className="btn chico sec" onClick={() => { setGuiaVista(true); try { localStorage.setItem('guia-visita-vista', '1') } catch { /* sin almacenamiento */ } }}>Entendido</button>
        </div>
        )}
        {tieneMascotas(casa) && (
          <>
            <p className="ayuda-sec" style={{ margin: '16px 0 8px' }}>¿Qué visita hacés hoy?</p>
            <div className="segmentos" role="radiogroup" aria-label="Tipo de visita">
              {TIPOS.map(([t, txt]) => (
                <button key={t} type="button" role="radio" aria-checked={tipo === t} className={tipo === t ? 'activo' : ''} onClick={() => cambiarTipo(t)}>{txt}</button>
              ))}
            </div>
            <p className="ayuda-sec" style={{ margin: '8px 0 0' }}>
              {tipo === 'completa' ? 'Se revisa toda la casa, la pileta, el parque y las mascotas.' : 'Para los días que solo pasás a darles de comer: mascotas y lo básico de la casa.'}
            </p>
          </>
        )}
        <div className="info-visita">
          <span className="chip">Entrada <span className="mono">{hora(v.inicio)}</span></span>
          {casa.mascotas && <span className="chip"><PawPrint size={14} weight="bold" /> {casa.mascotas}</span>}
        </div>

        {secciones.map((sec) => {
          const listos = sec.items.filter(([it]) => it.estado).length
          return (
            <section key={sec.nombre} className="seccion-visita">
              <header className="seccion-cab">
                <h2>{sec.nombre}</h2>
                <span className="mono">{listos}/{sec.items.length}</span>
                {listos < sec.items.length
                  ? <button type="button" className="btn-todo" onClick={() => todoBien(sec.nombre)}><Checks size={16} weight="bold" /> Marcar todo bien</button>
                  : <span className="listo-sec"><Check size={14} weight="bold" /> Lista</span>}
              </header>
              {sec.items.map(([it, n]) => (it.estado === 'ok' || it.estado === 'na') && !it.fotos.length ? (
                <button key={n} type="button" className={`item-listo ${it.estado}`} onClick={() => setItem(n, { estado: null })}
                  aria-label={`${it.texto}: ${it.estado === 'ok' ? 'Bien' : 'No hay'}. Tocá para cambiar`}>
                  <span className="marca">{it.estado === 'ok' ? <Check size={14} weight="bold" /> : <Minus size={14} weight="bold" />}</span>
                  <span className="txt">{it.texto}</span>
                  <span className="t-xs muted">{it.estado === 'ok' ? 'Bien' : 'No hay'} · Cambiar</span>
                </button>
              ) : (
                <div key={n} className={`item ${it.estado ?? ''}`}>
                  <div className="item-cab">
                    <p>{it.texto}</p>
                    <BotonFoto cantidad={it.fotos.length} onFotos={(urls) => setItem(n, { fotos: [...it.fotos, ...urls] })} />
                  </div>
                  <div className="estados">
                    {ESTADOS.map(([e, t, Icono]) => (
                      <button key={e} type="button" className={`estado-btn ${e} ${it.estado === e ? 'activo' : ''}`} aria-pressed={it.estado === e}
                        onClick={() => setItem(n, { estado: it.estado === e ? null : e })}>
                        <Icono size={16} weight="bold" /> {t}
                      </button>
                    ))}
                  </div>
                  {it.estado === 'novedad' && (
                    <textarea rows={2} value={it.nota} aria-label="Qué pasó" placeholder="Qué pasó y a quién llamaste (lo ve el dueño)"
                      onChange={(e) => setItem(n, { nota: e.target.value })} />
                  )}
                  <Fotos fotos={it.fotos} />
                  {it.fotos.length > 0 && (
                    <button type="button" className="link" onClick={() => setItem(n, { fotos: it.fotos.slice(0, -1) })}>Quitar última foto</button>
                  )}
                </div>
              ))}
            </section>
          )
        })}

        <section className="seccion-visita">
          <header className="seccion-cab"><h2>Para terminar</h2></header>
          <div className="bloque form" style={{ marginTop: 0 }}>
            <label>Mensaje para el dueño (opcional)
              <span className="ayuda">Lo lee el dueño en WhatsApp y en su enlace.</span>
              <textarea rows={3} value={v.notas} placeholder="El piletero pasa el jueves. Toto comió bien."
                onChange={(e) => setV({ ...v, notas: e.target.value })} />
            </label>
            <div>
              <p className="ayuda">Fotos generales para el dueño: frente, pileta, parque, mascotas.</p>
              <Fotos fotos={v.fotos} />
              <div style={{ marginTop: 8 }}>
                <BotonFoto texto="Agregar fotos" onFotos={(urls) => setV((x) => ({ ...x, fotos: [...x.fotos, ...urls] }))} />
              </div>
            </div>
          </div>
        </section>

        {error && <p className="error" role="alert">{error}</p>}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button type="button" className="link peligro" onClick={descartar}>Descartar y empezar de nuevo</button>
        </div>
      </main>

      <div className="pie-fijo">
        <div className="pie-fila">
          <Anillo hechos={hechos} total={total} />
          <button className="btn grande" onClick={terminar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Terminar visita'}
          </button>
        </div>
      </div>
    </>
  )
}
