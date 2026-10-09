import { useEffect, useState } from 'react'

// Tiempo transcurrido desde que empezó la visita.
export default function Cronometro({ desde }) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const seg = Math.max(0, Math.floor((ahora - new Date(desde)) / 1000))
  const mm = String(Math.floor(seg / 60)).padStart(2, '0')
  const ss = String(seg % 60).padStart(2, '0')
  return <span className="cronometro" aria-label="Tiempo de visita"><i />{mm}:{ss}</span>
}
