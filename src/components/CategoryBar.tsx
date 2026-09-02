import React from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from '../lib/categories'
import { Tabs, type TabItem } from './Tabs'

const TABS = ['Tendencia', ...CATEGORIES] as const
export type CategoryTab = (typeof TABS)[number]

// Barra de categorías estilo Polymarket: tabs de texto con subrayado, pegada
// bajo el navbar, con una línea inferior que no se mueve ("panel congelado").
// Dos modos: con onChange filtra in-place (Home); sin onChange cada tab es un
// Link a /mercados?cat= y el activo se lee de la URL (Perfil, Mercados).
// El wrapper es full-bleed (la línea cruza todo el ancho): renderizar FUERA
// del .page-container de la página. `children` = slot arriba de los tabs
// (buscador de la Home móvil).
interface Props {
  active?: CategoryTab
  onChange?: (tab: CategoryTab) => void
  sticky?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
}

export function CategoryBar({ active, onChange, sticky = true, children, style }: Props) {
  const { t } = useTranslation()
  const location = useLocation()

  const urlActive: CategoryTab | null = (() => {
    if (onChange) return null
    if (!location.pathname.startsWith('/mercados')) return null
    const cat = new URLSearchParams(location.search).get('cat')
    return cat && (TABS as readonly string[]).includes(cat) ? (cat as CategoryTab) : 'Tendencia'
  })()

  const items: TabItem<CategoryTab>[] = TABS.map(tab => ({
    key: tab,
    label: tab === 'Tendencia' ? t('home.tabTrending') : tab,
    to: onChange ? undefined : (tab === 'Tendencia' ? '/mercados' : `/mercados?cat=${encodeURIComponent(tab)}`),
  }))

  return (
    <div className={sticky ? 'cat-tabs-sticky' : 'tabs-line'} style={style}>
      <div className="page-container">
        {children}
        <Tabs items={items} active={onChange ? active : urlActive} onChange={onChange} ariaLabel={t('nav.markets')} />
      </div>
    </div>
  )
}
