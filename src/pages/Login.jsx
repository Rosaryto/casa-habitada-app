import { useState } from 'react'
import { EnvelopeSimple } from '@phosphor-icons/react'
import { entrar, mandarLinkDeEntrada, modoDemo } from '../lib/store.js'
import { MARCA, LEMA } from '../config.js'
import Logo from '../components/Logo.jsx'

const FOTO = 'https://images.unsplash.com/photo-1652878856832-887df545cb0c?w=900&q=70&fm=webp&fit=crop'

// Entrada sin contraseña: escribís tu correo, te llega un link y con tocarlo entrás.
// La contraseña queda como opción secundaria.
export default function Login({ onEntrar }) {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [conClave, setConClave] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      if (modoDemo || conClave) onEntrar(await entrar(email.trim(), clave))
      else {
        await mandarLinkDeEntrada(email.trim())
        setEnviado(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <div className="login-foto"><img src={FOTO} alt="" /></div>
      <div className="login-cuerpo">
        <Logo tam={48} />
        <h1>{MARCA}</h1>
        <p>{LEMA}</p>

        {enviado ? (
          <div className="bloque mail-enviado">
            <span className="circulo"><EnvelopeSimple size={28} /></span>
            <h2>Revisá tu correo</h2>
            <p>Te mandamos un enlace a <b>{email}</b>. Abrilo <b>en esta misma computadora o celular</b> y tocá el botón del correo para entrar.</p>
            <p className="t-xs muted">Si no lo ves en unos minutos, fijate en la carpeta de correo no deseado (spam).</p>
            <button type="button" className="link" onClick={() => setEnviado(false)}>Usar otro correo</button>
          </div>
        ) : (
          <form onSubmit={enviar}>
            {modoDemo ? (
              <p className="muted t-xs">Modo demo: entrás sin contraseña y los datos quedan en este navegador.</p>
            ) : (
              <>
                <label>Tu correo
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                    autoComplete="email" inputMode="email" placeholder="nombre@gmail.com" />
                </label>
                {conClave && (
                  <label>Contraseña<input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" /></label>
                )}
              </>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            <button className="btn grande" disabled={enviando}>
              {enviando ? 'Un momento…' : modoDemo || conClave ? 'Entrar' : 'Mandarme el enlace para entrar'}
            </button>
            {!modoDemo && (
              <button type="button" className="link" style={{ justifySelf: 'center' }} onClick={() => { setConClave(!conClave); setError('') }}>
                {conClave ? 'Mejor entrar con un enlace al correo' : 'Prefiero entrar con contraseña'}
              </button>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
