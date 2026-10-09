// Casa y visitas de ejemplo para el modo demo (sirven para mostrarle la app a un cliente).
import { CHECKLIST_BASE, SECCIONES_VISITA_CORTA } from '../config.js'

const foto = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70&fm=webp&fit=crop`
const PORTADA = foto('1721989518229-3e84837fc398')
const PILETA = foto('1721989519334-40923a0ee1c0')
const CASA = foto('1776790810994-2c91ee4965b3')
const PERRO = foto('1539692177343-b2b990faef15')
const GATO = foto('1492102236745-fccb3441109e')
const RIEGO = foto('1770664945615-52203ab54c88')
const BANIO = foto('1783685633414-a32b931e5b97')

export const CASA_EJEMPLO = {
  nombre: 'Casa Arias',
  direccion: 'La Almudena, San Lorenzo',
  dueno_nombre: 'Mercedes Arias',
  dueno_telefono: '',
  plan: 'Plan Compañía',
  mascotas: 'Toto (ovejero) y Luna (gata)',
  notas: 'Llave en el llavero verde. Piletero: Ramón, pasa los jueves.',
  checklist: CHECKLIST_BASE,
  foto: PORTADA,
  token: 'ejemplo',
}

function visita(tipo, diasAtras, horaInicio, minutos, novedad, fotos, notas) {
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - diasAtras)
  inicio.setHours(horaInicio, 5 + diasAtras * 3, 0, 0)
  const fin = new Date(inicio.getTime() + minutos * 60000)
  const secciones = tipo === 'mascotas' ? CHECKLIST_BASE.filter((s) => SECCIONES_VISITA_CORTA.includes(s.seccion)) : CHECKLIST_BASE
  const items = secciones.flatMap((s) =>
    s.items.map((texto) => {
      const nov = novedad && novedad.texto === texto
      return {
        seccion: s.seccion,
        texto,
        estado: nov ? 'novedad' : 'ok',
        nota: nov ? novedad.nota : '',
        fotos: texto.startsWith('Pileta') ? [PILETA] : texto.startsWith('Riego') ? [RIEGO] : nov && novedad.foto ? [novedad.foto] : [],
      }
    }),
  )
  return { tipo, inicio: inicio.toISOString(), fin: fin.toISOString(), items, fotos, notas }
}

export const visitasEjemplo = () => [
  visita('completa', 0, 10, 52, null, [PERRO, CASA, GATO], 'Toto y Luna comieron bien. Dejé la persiana del living a medio subir.'),
  visita('mascotas', 1, 18, 28, null, [GATO], 'Paseo corto con Toto. Luna no salió de abajo de la cama, pero comió todo.'),
  visita('completa', 2, 17, 64, { texto: 'Paredes y techos: sin humedad ni manchas', nota: 'Mancha chica en el techo del baño de arriba. Viene el plomero el viernes a las 9.', foto: BANIO }, [CASA], ''),
  visita('mascotas', 3, 9, 31, null, [PERRO], ''),
  visita('completa', 4, 9, 48, null, [PILETA], 'Pasó Ramón por la pileta. Cloro en 1,5.'),
]
