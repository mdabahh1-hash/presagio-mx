import React from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from '../lib/categories'
import { Tabs, type TabItem } from './Tabs'

// Feeds (no son categorías del API): Tendencia, Noticias y Nuevo, con icono,
// separados de las categorías por una línea vertical (estilo Polymarket).
// Noticias es una página propia (/noticias): siempre es un Link.
export const FEEDS = ['Tendencia', 'Noticias', 'Nuevo'] as const
export type Feed = (typeof FEEDS)[number]
const TABS = [...FEEDS, ...CATEGORIES] as const
export type CategoryTab = (typeof TABS)[number]
export const isFeed = (tab: string): tab is Feed => (FEEDS as readonly string[]).includes(tab)

// Barra de categorías estilo Polymarket: tabs de texto con subrayado, pegada
// bajo el navbar, con una línea inferior que no se mueve ("panel congelado").
// Dos modos: con onChange filtra in-place (Home); sin onChange cada tab es un
// Link (Tendencia → /mercados, Nuevo → /mercados?sort=new, categoría →
// /mercados?cat=) y el activo se lee de la URL (Perfil, Mercados, Noticias).
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
    if (location.pathname.startsWith('/noticias')) return 'Noticias'
    if (!location.pathname.startsWith('/mercados')) return null
    const params = new URLSearchParams(location.search)
    const cat = params.get('cat')
    if (cat && (TABS as readonly string[]).includes(cat)) return cat as CategoryTab
    return params.get('sort') === 'new' ? 'Nuevo' : 'Tendencia'
  })()

  const linkTo = (tab: CategoryTab) => {
    if (tab === 'Noticias') return '/noticias'
    if (onChange) return undefined
    if (tab === 'Tendencia') return '/mercados'
    if (tab === 'Nuevo') return '/mercados?sort=new'
    return `/mercados?cat=${encodeURIComponent(tab)}`
  }

  const items: TabItem<CategoryTab>[] = TABS.map(tab => ({
    key: tab,
    label: tab === 'Tendencia' ? t('home.tabTrending')
      : tab === 'Noticias' ? t('home.tabNews')
      : tab === 'Nuevo' ? t('home.tabNew')
      : tab,
    icon: tab === 'Tendencia' ? 'trending' : tab === 'Noticias' ? 'news' : tab === 'Nuevo' ? 'sparkle' : undefined,
    divider: tab === CATEGORIES[0],
    to: linkTo(tab),
  }))

  return (
    <div className={sticky ? 'cat-tabs-sticky' : 'tabs-line'} style={style}>
      <div className="page-container anim-1">
        {children}
        <Tabs items={items} active={onChange ? active : urlActive} onChange={onChange} ariaLabel={t('nav.markets')} />
      </div>
    </div>
  )
}
