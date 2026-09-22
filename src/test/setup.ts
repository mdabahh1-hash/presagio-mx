import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18n from '../i18n'

// Tests en español: es.json es la fuente de verdad del catálogo.
void i18n.changeLanguage('es')
afterEach(cleanup)

// jsdom no trae ResizeObserver (lo usa useFitText) ni mide texto: el stub deja
// que el hook corra sin observar nada.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
