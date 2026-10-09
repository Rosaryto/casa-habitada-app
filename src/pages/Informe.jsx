import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, WarningCircle, WhatsappLogo } from '@phosphor-icons/react'
import { obtenerInforme } from '../lib/store.js'
import { hora, novedades } from '../lib/formato.js'
import { haceCuanto } from '../lib/agenda.js'
import { A_CARGO, MARCA, MI_WHATSAPP } from '../config.js'
import VisitaDetalle, { Fotos } from '../components/VisitaDetalle.jsx'
import Logo from '../components/Logo.jsx'

// Página que ve el dueño de la casa. No necesita usuario: entra con su link.
export default function Informe() {
  const { token } = useParams()
  const [datos, setDatos] = useState(undefined)
  const [error, setError] = useState('')
  const [ahora] = useState(() => Date.now())

  useEffect(() => {
    obtenerInforme(token).then(setDatos).catch((e) => setError(e.message))
  }, [token])

  const top = (
    <div className="informe-top">
      <Logo tam={28} />
      <span>{MARCA}<small>Informe de cuidado de tu casa</small></span>
    </div>
  )

  if (error) return <main className="pantalla">{top}<p className="error" role="alert">No se pudo cargar el informe. Probá de nuevo en un rato.</p></main>
  if (datos === undefined) return <main className="pantalla">{top}<div className="esqueleto"><div /><div /><div /></div></main>
  if (!datos?.casa) return <main className="pantalla">{top}<p>Este enlace no es válido. Pedile uno nuevo a {MARCA}.</p></main>

  const { casa, visitas } = datos
  const ultima = visitas[0]
  const delMes = visitas.filter((v) => new Date(v.inicio) >= ahora - 30 * 864e5)
  const novMes = delMes.reduce((n, v) => n + novedades(v).length, 0)
  const portada = casa.foto || visitas.find((v) => v.fotos?.length)?.fotos[0]
  const novUltima = ultima ? novedades(ultima) : []
  const fotosUltima = ultima ? [...(ultima.fotos ?? []), ...ultima.items.flatMap((it) => it.fotos ?? [])] : []
  const cuando = ultima ? haceCuanto(ultima.inicio, ahora) : ''
  const cuandoTexto = cuando.startsWith('hace') ? cuando : `${cuando.split(' ')[0]} a las ${ultima ? hora(ultima.inicio) : ''}`

  return (
    <main className="pantalla">
      {top}
      <div className="informe-portada">
        <header className={`portada ${portada ? '' : 'sin-foto'}`}>
          {portada && <img src={portada} alt="" />}
          <h1>{casa.nombre}</h1>
          {casa.direccion && <p>{casa.direccion}</p>}
        </header>
      </div>

      {ultima ? (
        <>
          <section className={`estado-casa ${novUltima.length ? 'alerta' : 'ok'}`}>
            {novUltima.length ? <WarningCircle size={32} weight="fill" /> : <CheckCircle size={32} weight="fill" />}
            <div>
              <h2>{novUltima.length ? (novUltima.length === 1 ? 'Hay algo para tener en cuenta' : `Hay ${novUltima.length} cosas para tener en cuenta`) : 'Tu casa está en orden'}</h2>
              <p>Última visita {cuandoTexto}{ultima.tipo === 'mascotas' ? ', visita a las mascotas' : ''}.</p>
              {novUltima.map((it, n) => <p key={n} className="estado-nov">• {it.nota || it.texto}</p>)}
              {ultima.notas && <p className="estado-nota">“{ultima.notas}”</p>}
            </div>
          </section>

          {fotosUltima.length > 0 && (
            <>
              <h2 className="sec-titulo">Fotos de la última visita</h2>
              <div className="fotos-grandes"><Fotos fotos={fotosUltima} /></div>
            </>
          )}

          <p className="resumen-mes">En los últimos 30 días: <b>{delMes.length} {delMes.length === 1 ? 'visita' : 'visitas'}</b>{novMes ? <>, <b>{novMes} {novMes === 1 ? 'novedad' : 'novedades'}</b></> : ', sin novedades'}.</p>
        </>
      ) : (
        <p className="bloque">Todavía no hay visitas registradas. Después de la primera visita vas a ver acá cómo está tu casa, con fotos.</p>
      )}

      {visitas.length > 0 && (
        <>
          <h2 className="sec-titulo">Todas las visitas</h2>
          <p className="ayuda-sec">Tocá una visita para ver el detalle.</p>
          <ol className="timeline">
            {visitas.map((v, i) => <VisitaDetalle key={v.id} visita={v} i={i} />)}
          </ol>
        </>
      )}

      {MI_WHATSAPP && <footer className="informe-pie">
        <h2>¿Alguna consulta sobre tu casa?</h2>
        <p className="muted">{A_CARGO ? `Escribile a ${A_CARGO} por WhatsApp.` : 'Escribinos por WhatsApp.'}</p>
        <a className="btn wa" target="_blank" rel="noopener"
          href={`https://wa.me/${MI_WHATSAPP}?text=${encodeURIComponent(`Hola! Te escribo por ${casa.nombre}.`)}`}>
          <WhatsappLogo size={20} weight="fill" /> {A_CARGO ? `Escribirle a ${A_CARGO}` : 'Escribir por WhatsApp'}
        </a>
      </footer>}
      <p className="informe-firma">{MARCA} · Cuidado de casas en Salta y alrededores</p>
    </main>
  )
}
