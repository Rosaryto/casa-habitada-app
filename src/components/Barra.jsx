import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { MARCA } from '../config.js'
import { modoDemo, modoDemoForzado, salirDelDemo } from '../lib/store.js'
import Logo from './Logo.jsx'

// Barra superior fija. Con `volver` muestra la flecha; si no, la marca.
export default function Barra({ volver, titulo, subtitulo, derecha }) {
  return (
    <header className="barra">
      {volver ? (
        <Link to={volver} className="icono" aria-label="Volver"><ArrowLeft size={22} /></Link>
      ) : (
        <span className="barra-marca">
          <Logo tam={28} /> {MARCA}
          {modoDemo && <span className="pill-demo">Demo</span>}
          {modoDemoForzado && (
            <button type="button" className="link" style={{ fontSize: 'var(--t-xs)' }} onClick={salirDelDemo}>
              Salir del demo
            </button>
          )}
        </span>
      )}
      {titulo && (
        <div className="barra-titulo">
          <b>{titulo}</b>
          {subtitulo && <span>{subtitulo}</span>}
        </div>
      )}
      {derecha && <div className="barra-der">{derecha}</div>}
    </header>
  )
}
