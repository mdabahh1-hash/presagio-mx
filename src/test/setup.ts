import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18n from '../i18n'

// Tests en español: es.json es la fuente de verdad del catálogo.
void i18n.changeLanguage('es')
afterEach(cleanup)
