import { Check } from '@phosphor-icons/react'

// Animación al terminar la visita.
export default function Festejo() {
  const chispas = [[-52, -40], [48, -48], [60, 8], [-60, 12], [-24, -64], [28, 56], [-36, 52]]
  return (
    <div className="festejo" aria-hidden="true">
      <span className="onda" /><span className="onda dos" />
      {chispas.map(([x, y], i) => <span key={i} className="chispa" style={{ '--x': `${x}px`, '--y': `${y}px`, animationDelay: `${250 + i * 40}ms` }} />)}
      <span className="check"><Check size={40} weight="bold" /></span>
    </div>
  )
}
