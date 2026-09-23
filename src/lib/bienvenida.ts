// Cuadro de bienvenida: se marca al crear una cuenta (verificar email o
// OAuth con ?nuevo=1) y WelcomeModal lo muestra una sola vez.

const KEY = 'veredikt.bienvenida'

export function marcarBienvenida(): void {
  try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
}

export function leerBienvenida(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function borrarBienvenida(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
