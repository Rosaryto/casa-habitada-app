import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarBlank, CaretRight, HouseLine, Info, PawPrint, Play, Plus, SignOut } from '@phosphor-icons/react'
import { listarCasas, resumenVisitas, cargarEjemplo, modoDemo } from '../lib/store.js'
import { estadoCasa, haceCuanto, saludo } from '../lib/agenda.js'
import { fechaLarga } from '../lib/formato.js'
import Barra from '../components/Barra.jsx'
import Esqueleto from '../components/Esqueleto.jsx'

const HOY_TEXTO = fechaLarga(new Date().toISOString())

function CasaCard({ casa, resumen, estado, i }) {
  const ultima = resumen?.ultima
  return (
    <li className={`casa-card ${estado.clave}`} style={{ '--i': i }}>
      <Link to={`/casa/${casa.id}`} className="casa-link">
        <span className="casa-foto">
          {casa.foto || resumen?.foto ? <img src={casa.foto || resumen.foto} alt="" loading="lazy" /> : <HouseLine size={28} />}
        </span>
        <span className="casa-info">
          <b>{casa.nombre}</b>
          <span className="t-xs muted">{ultima ? `Última visita ${haceCuanto(ultima.inicio)}` : casa.direccion || 'Sin visitas todavía'}</span>
          <span className="casa-meta">
            <span className={`estado ${estado.clave}`}>{estado.texto}</span>
            {casa.mascotas && <span className="t-xs muted con-icono"><PawPrint size={14} /> Mascotas</span>}
          </span>
        </span>
        {estado.clave !== 'toca' && <CaretRight size={18} className="muted" aria-hidden="true" />}
      </Link>
      {estado.clave === 'toca' && <Link to={`/casa/${casa.id}/visita`} className="btn chico"><Play size={14} weight="fill" /> Empezar visita</Link>}
    </li>
  )
}

export default function Casas({ onSalir }) {
  const navegar = useNavigate()
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listarCasas(), resumenVisitas()])
      .then(([casas, resumen]) => setDatos({ casas, resumen }))
      .catch((e) => setError(e.message))
  }, [])

  const barra = (
    <Barra derecha={
      <>
        <Link to="/agenda" className="btn chico sec"><CalendarBlank size={16} weight="bold" /> Agenda</Link>
        <Link to="/casa/nueva" className="btn chico"><Plus size={16} weight="bold" /> Agregar casa</Link>
      </>
    } />
  )

  if (error) return <>{barra}<main className="pantalla"><p className="error" role="alert">{error}</p></main></>
  if (!datos) return <>{barra}<Esqueleto /></>

  const { casas, resumen } = datos
  const conEstado = casas.map((c) => ({ casa: c, resumen: resumen[c.id], estado: estadoCasa(c, resumen[c.id]?.ultima) }))
  const paraHoy = conEstado.filter((x) => x.estado.clave === 'toca')
  const resto = conEstado.filter((x) => x.estado.clave !== 'toca')
  const hechasHoy = conEstado.filter((x) => x.estado.clave === 'hecha').length

  return (
    <>
      {barra}
      <main className="pantalla">
        <header className="saludo">
          <p className="fecha">{HOY_TEXTO}</p>
          <h1>{saludo()}</h1>
          {casas.length > 0 && (
            <p>
              {paraHoy.length
                ? <>Hoy te {paraHoy.length === 1 ? 'toca' : 'tocan'} <b>{paraHoy.length} {paraHoy.length === 1 ? 'visita' : 'visitas'}</b>{hechasHoy > 0 && `, ya hiciste ${hechasHoy}`}.</>
                : hechasHoy ? <>Hiciste <b>{hechasHoy} {hechasHoy === 1 ? 'visita' : 'visitas'}</b> hoy. Todo al día.</> : 'Todas las casas están al día.'}
            </p>
          )}
        </header>

        {casas.length === 0 ? (
          <div className="bloque vacio">
            <span className="circulo"><HouseLine size={32} /></span>
            <h2>Cargá tu primera casa</h2>
            <p>Datos del dueño, plan y lista de control. Después, en cada visita, marcás la lista y sacás fotos.</p>
            <div className="botones">
              <Link className="btn" to="/casa/nueva"><Plus size={18} weight="bold" /> Nueva casa</Link>
              {modoDemo && (
                <button className="btn sec" onClick={async () => navegar(`/casa/${(await cargarEjemplo()).id}`)}>Ver un ejemplo</button>
              )}
            </div>
          </div>
        ) : (
          <>
            {paraHoy.length > 0 && (
              <section>
                <h2 className="sec-titulo">Te toca visitar hoy <span className="contador">{paraHoy.length}</span></h2>
                <p className="ayuda-sec">Cuando llegues a la casa, tocá <b>Empezar visita</b>.</p>
                <ul className="lista-casas">{paraHoy.map((x, i) => <CasaCard key={x.casa.id} {...x} i={i} />)}</ul>
              </section>
            )}
            {resto.length > 0 && (
              <section>
                <h2 className="sec-titulo">{paraHoy.length ? 'No te tocan hoy' : 'Tus casas'}</h2>
                <p className="ayuda-sec">Tocá una casa para ver sus datos, el enlace del dueño y las visitas anteriores.</p>
                <ul className="lista-casas">{resto.map((x, i) => <CasaCard key={x.casa.id} {...x} i={i + paraHoy.length} />)}</ul>
              </section>
            )}
          </>
        )}

        {modoDemo && (
          <p className="nota-demo">
            <Info size={18} weight="bold" />
            <span>Modo demo: los datos quedan solo en este navegador. Para que los dueños vean sus informes, configurá Supabase (está en el README).</span>
          </p>
        )}
        <div className="cerrar-sesion">
          <button className="link" onClick={onSalir}><SignOut size={16} /> Cerrar sesión</button>
        </div>
      </main>
    </>
  )
}
