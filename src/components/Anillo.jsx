// Anillo de progreso: cuántos puntos de la lista ya quedaron marcados.
export default function Anillo({ hechos, total }) {
  const r = 24
  const c = 2 * Math.PI * r
  return (
    <div className="anillo" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hechos} aria-label="Puntos revisados">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle className="pista" cx="28" cy="28" r={r} />
        <circle className="valor" cx="28" cy="28" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - hechos / total)} />
      </svg>
      <span>{hechos}/{total}</span>
      <small>marcados</small>
    </div>
  )
}
