// Placeholder con la forma de la pantalla mientras cargan los datos.
export default function Esqueleto({ filas = 3 }) {
  return (
    <div className="pantalla">
      <div className="esqueleto" aria-busy="true" aria-label="Cargando">
        {Array.from({ length: filas + 1 }, (_, i) => <div key={i} />)}
      </div>
    </div>
  )
}
