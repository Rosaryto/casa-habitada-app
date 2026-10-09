import { HouseLine } from '@phosphor-icons/react'

export default function Logo({ tam = 30 }) {
  return (
    <span className="marca-icono" style={{ width: tam, height: tam }} aria-hidden="true">
      <HouseLine size={tam * 0.58} weight="bold" />
    </span>
  )
}
