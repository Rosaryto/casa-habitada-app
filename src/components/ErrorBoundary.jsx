import { Component } from 'react'
import { WarningCircle } from '@phosphor-icons/react'

// Si algo falla al dibujar la pantalla, en vez de quedar en blanco se muestra
// este aviso con manera de volver a empezar.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  volverAlInicio = () => {
    location.hash = '#/'
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="pantalla">
        <div className="bloque vacio">
          <span className="circulo"><WarningCircle size={32} weight="fill" /></span>
          <h1>Algo salió mal</h1>
          <p>La app encontró un problema inesperado. Probá otra vez; si sigue pasando, recargá la página.</p>
          <div className="botones">
            <button type="button" className="btn" onClick={() => this.setState({ error: null })}>Intentar de nuevo</button>
            <button type="button" className="btn sec" onClick={this.volverAlInicio}>Volver al inicio</button>
          </div>
        </div>
      </main>
    )
  }
}
