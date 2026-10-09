import { useEffect, useRef, useState } from 'react'
import { CaretDown, CaretLeft, CaretRight, Check, HouseLine, Minus, PawPrint, WarningCircle, X } from '@phosphor-icons/react'
import { fecha, hora, duracion, novedades } from '../lib/formato.js'

const MARCA_ESTADO = {
  ok: <Check size={12} weight="bold" />,
  novedad: <WarningCircle size={13} weight="bold" />,
  na: <Minus size={12} weight="bold" />,
}

// Miniaturas; al tocar una se abre el visor a pantalla completa.
export function Fotos({ fotos }) {
  const [abierta, setAbierta] = useState(null)
  if (!fotos?.length) return null
  return (
    <>
      <div className="fotos">
        {fotos.map((f, i) => (
          <button key={f + i} type="button" onClick={() => setAbierta(i)} aria-label={`Ver foto ${i + 1} de ${fotos.length}`}>
            <img src={f} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {abierta !== null && <Visor fotos={fotos} inicio={abierta} onCerrar={() => setAbierta(null)} />}
    </>
  )
}

// Visor a pantalla completa: flechas, teclado y deslizar con el dedo.
export function Visor({ fotos, inicio = 0, onCerrar }) {
  const [i, setI] = useState(inicio)
  const toque = useRef(null)
  const ir = (d) => setI((n) => (n + d + fotos.length) % fotos.length)

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight') setI((n) => (n + 1) % fotos.length)
      if (e.key === 'ArrowLeft') setI((n) => (n - 1 + fotos.length) % fotos.length)
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = '' }
  }, [fotos.length, onCerrar])

  return (
    <div className="visor" role="dialog" aria-label="Fotos" onClick={onCerrar}
      onTouchStart={(e) => { toque.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (toque.current ?? 0)
        if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1)
      }}>
      <img key={i} src={fotos[i]} alt={`Foto ${i + 1} de ${fotos.length}`} onClick={(e) => e.stopPropagation()} />
      <button type="button" className="visor-cerrar" aria-label="Cerrar" onClick={onCerrar}><X size={22} weight="bold" /></button>
      {fotos.length > 1 && (
        <>
          <button type="button" className="visor-flecha izq" aria-label="Foto anterior" onClick={(e) => { e.stopPropagation(); ir(-1) }}><CaretLeft size={24} weight="bold" /></button>
          <button type="button" className="visor-flecha der" aria-label="Foto siguiente" onClick={(e) => { e.stopPropagation(); ir(1) }}><CaretRight size={24} weight="bold" /></button>
          <span className="visor-contador mono">{i + 1} de {fotos.length}</span>
        </>
      )}
    </div>
  )
}

// Una visita en la línea de tiempo: fecha, hora y estado; al abrirla, lo revisado con notas y fotos.
export default function VisitaDetalle({ visita, abierta: abiertaInicial = false, acciones, i = 0 }) {
  const [abierta, setAbierta] = useState(abiertaInicial)
  const [verTodo, setVerTodo] = useState(false)
  const nov = novedades(visita)
  const deMascotas = visita.tipo === 'mascotas'
  const secciones = {}
  for (const it of visita.items) (secciones[it.seccion] ??= []).push(it)
  const bien = visita.items.filter((it) => it.estado === 'ok')
  // Fotos de puntos que estaban bien (pileta, riego…): se muestran junto a las generales.
  const fotosBien = bien.flatMap((it) => it.fotos ?? [])
  const totalFotos = (visita.fotos?.length ?? 0) + visita.items.reduce((n, it) => n + (it.fotos?.length ?? 0), 0)

  return (
    <li className={`tl-item ${nov.length ? 'novedad' : 'ok'}`} style={{ '--i': i }} id={`visita-${visita.id}`}>
      <span className="tl-punto" aria-hidden="true">
        {nov.length ? <WarningCircle size={16} weight="bold" /> : deMascotas ? <PawPrint size={16} weight="bold" /> : <HouseLine size={16} weight="bold" />}
      </span>
      <article className="tl-card">
        <button type="button" className="tl-cab" onClick={() => setAbierta(!abierta)} aria-expanded={abierta}>
          <span className="txt">
            <b>{fecha(visita.inicio)}</b>
            <span className="t-xs">
              {deMascotas ? 'Visita a las mascotas' : 'Visita completa'} · <span className="mono">{hora(visita.inicio)}</span> · {duracion(visita.inicio, visita.fin)}
            </span>
          </span>
          {nov.length > 0 && <span className="chip alerta">{nov.length} {nov.length > 1 ? 'novedades' : 'novedad'}</span>}
          {!nov.length && totalFotos > 0 && <span className="chip">{totalFotos} {totalFotos === 1 ? 'foto' : 'fotos'}</span>}
          <CaretDown size={18} className="caret" />
        </button>

        {abierta && (
          <div className="tl-cuerpo">
            {visita.notas && <p className="nota-general">{visita.notas}</p>}
            <Fotos fotos={[...(visita.fotos ?? []), ...fotosBien]} />

            {nov.length > 0 && (
              <div className="a-revisar">
                <h4><WarningCircle size={16} weight="bold" /> {nov.length === 1 ? 'Para tener en cuenta' : `${nov.length} cosas para tener en cuenta`}</h4>
                <ul className="items">
                  {nov.map((it, n) => (
                    <li key={n} className="novedad">
                      <span className="marca">{MARCA_ESTADO.novedad}</span>
                      <div>
                        <span className="t-xs muted">{it.seccion}</span>
                        <br />{it.nota || it.texto}
                        <Fotos fotos={it.fotos} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bien.length > 0 && (
              <button type="button" className="resumen-bien" onClick={() => setVerTodo(!verTodo)} aria-expanded={verTodo}>
                <span className="marca ok">{MARCA_ESTADO.ok}</span>
                <span><b>{bien.length} {bien.length === 1 ? 'punto revisado' : 'puntos revisados'} sin problemas</b>
                  <span className="t-xs muted">{verTodo ? 'Ocultar la lista' : 'Ver qué se revisó'}</span></span>
                <CaretDown size={16} className="caret" />
              </button>
            )}

            {verTodo && Object.entries(secciones).map(([seccion, items]) => (
              <section key={seccion}>
                <h4>{seccion}</h4>
                <ul className="items">
                  {items.map((it, n) => (
                    <li key={n} className={it.estado}>
                      <span className="marca" aria-label={it.estado}>{MARCA_ESTADO[it.estado]}</span>
                      <div>
                        {it.texto}
                        {it.nota && <p className="nota">{it.nota}</p>}
                        <Fotos fotos={it.fotos} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {acciones}
          </div>
        )}
      </article>
    </li>
  )
}
