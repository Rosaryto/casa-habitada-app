// Achica las fotos del celular (que pesan 3-5 MB) a ~150 KB antes de subirlas.
export async function comprimirImagen(archivo, lado = 1280, calidad = 0.72) {
  const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * escala)
  canvas.height = Math.round(bmp.height * escala)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', calidad))
}
