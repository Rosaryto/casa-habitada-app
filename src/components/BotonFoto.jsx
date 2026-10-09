import { useRef, useState } from 'react'
import { Camera } from '@phosphor-icons/react'
import { subirFoto } from '../lib/store.js'

// Botón para sacar o elegir fotos. En el celular ofrece cámara o galería.
export default function BotonFoto({ onFotos, cantidad = 0, texto }) {
  const ref = useRef()
  const [subiendo, setSubiendo] = useState(0)
  const [error, setError] = useState('')

  async function elegir(e) {
    const archivos = [...e.target.files]
    e.target.value = ''
    setError('')
    setSubiendo(archivos.length)
    try {
      const urls = []
      for (const a of archivos) {
        urls.push(await subirFoto(a))
        setSubiendo((n) => n - 1)
      }
      onFotos(urls)
    } catch (err) {
      setError(err.message || 'No se pudo subir la foto')
    } finally {
      setSubiendo(0)
    }
  }

  return (
    <>
      <button type="button" className={`btn-foto ${texto ? 'ancho' : ''} ${subiendo ? 'subiendo' : ''}`} onClick={() => ref.current.click()}
        disabled={subiendo > 0} aria-label={texto ? undefined : 'Sacar foto de este punto'}>
        <Camera size={18} />
        {texto ? (subiendo ? `Subiendo ${subiendo}…` : texto) : subiendo ? '…' : 'Foto'}
        {!texto && cantidad > 0 && <span className="n">{cantidad}</span>}
      </button>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={elegir} />
      {error && <p className="error" role="alert">{error}</p>}
    </>
  )
}
