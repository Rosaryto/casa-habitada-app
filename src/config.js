// ===== Configuración general: cambiá acá el nombre y tu WhatsApp =====
export const MARCA = 'Casa Habitada'
export const LEMA = 'No dejo tu casa vacía. La cuido por vos.'
// Nombre de quien está a cargo: aparece en el informe del dueño ("Escribirle a Virginia").
export const A_CARGO = 'Virginia'
export const MI_WHATSAPP = '5493815539646' // de prueba. 549 + código de área sin 0 + número sin 15. Vacío = no se muestra el botón.

// Si hay mascotas, la visita es diaria: Plan Compañía o Turno Minero con mascotas.
export const PLANES = [
  'Visita suelta',
  'Plan Tranquilo',
  'Plan Presente',
  'Plan Compañía',
  'Plan Turno Minero',
  'Plan Turno Minero con mascotas',
]

// Secciones que se revisan en la visita corta de mascotas (los días que no toca la visita completa).
export const SECCIONES_VISITA_CORTA = ['Seguridad y casa habitada', 'Mascotas']

// Lista de control base. Cada casa arranca con esta y se puede editar.
export const CHECKLIST_BASE = [
  {
    seccion: 'Seguridad y casa habitada',
    items: [
      'Puertas, ventanas y portón cerrados; alarma activada',
      'Mover persianas y luces',
      'Juntar correspondencia, diarios y volantes',
    ],
  },
  {
    seccion: 'Humedad y pérdidas',
    items: [
      'Paredes y techos: sin humedad ni manchas',
      'Ventanas: sin filtraciones',
      'Baños: tirar la cadena y abrir canillas',
      'Cocina y lavadero: canillas y bajo mesada',
    ],
  },
  {
    seccion: 'Equipos',
    items: [
      'Heladera y freezer funcionando',
      'Termotanque / calefón',
      'Luz y térmica',
    ],
  },
  {
    seccion: 'Exterior',
    items: ['Pileta: color, nivel y cloro', 'Riego del parque y macetas'],
  },
  {
    seccion: 'Mascotas',
    items: ['Comida y agua', 'Limpieza (piedras, cama, patio)', 'Juego o paseo', 'Estado general'],
  },
]
