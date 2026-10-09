export const nuevoId = () => crypto.randomUUID()
export const nuevoToken = () => crypto.randomUUID().replaceAll('-', '').slice(0, 20)
