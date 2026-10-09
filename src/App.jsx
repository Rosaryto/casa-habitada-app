import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { sesionActual, alCambiarSesion, salir } from './lib/store.js'
import Esqueleto from './components/Esqueleto.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Login from './pages/Login.jsx'

// Cada pantalla se baja sola cuando hace falta: el informe del dueño (público,
// desde el celular) no se traga el resto de la app. Login queda cargado porque
// es lo primero que ve quien no tiene sesión.
const Casas = lazy(() => import('./pages/Casas.jsx'))
const CasaForm = lazy(() => import('./pages/CasaForm.jsx'))
const Casa = lazy(() => import('./pages/Casa.jsx'))
const NuevaVisita = lazy(() => import('./pages/NuevaVisita.jsx'))
const Informe = lazy(() => import('./pages/Informe.jsx'))

function Privado() {
  const [sesion, setSesion] = useState(undefined)

  useEffect(() => {
    sesionActual().then(setSesion)
    return alCambiarSesion(setSesion)
  }, [])

  if (sesion === undefined) return <Esqueleto />
  if (!sesion) return <Login onEntrar={setSesion} />

  const cerrarSesion = async () => { await salir(); setSesion(null) }

  return (
    <Routes>
      <Route path="/" element={<Casas onSalir={cerrarSesion} />} />
      <Route path="/casa/nueva" element={<CasaForm key="nueva" />} />
      <Route path="/casa/:id" element={<Casa />} />
      <Route path="/casa/:id/editar" element={<CasaForm key="editar" />} />
      <Route path="/casa/:id/visita" element={<NuevaVisita />} />
    </Routes>
  )
}

function Rutas() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <Routes>
      <Route path="/informe/:token" element={<Informe />} />
      <Route path="/*" element={<Privado />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ErrorBoundary>
        <Suspense fallback={<Esqueleto />}>
          <Rutas />
        </Suspense>
      </ErrorBoundary>
    </HashRouter>
  )
}
