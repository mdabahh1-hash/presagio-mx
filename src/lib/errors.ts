import i18n from '../i18n'

// Mapea un error del API a texto para el usuario. Si el backend mandó un
// `code` estructurado que existe en el catálogo (errors.<CODE>), se muestra
// traducido al idioma activo; si no, cae al `message` del backend (español)
// y, en última instancia, a errors.unknown. Nunca muestra un key crudo.
export function translateApiError(err: unknown): string {
  const e = err as { code?: string; message?: string; detail?: Record<string, unknown> } | null
  if (e?.code) {
    const key = `errors.${e.code}`
    // El catálogo se consulta en runtime; el cast fija el tipo de retorno a
    // string sin abrir la puerta a keys arbitrarios en el resto del código.
    // Los campos extra del detail (p.ej. available/required de
    // INSUFFICIENT_BALANCE) se pasan como variables de interpolación.
    if (i18n.exists(key)) return i18n.t(key as 'errors.unknown', { ...(e.detail ?? {}) })
  }
  if (e?.message) return e.message
  return i18n.t('errors.unknown')
}
