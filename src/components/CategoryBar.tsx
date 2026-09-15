import React from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from '../lib/categories'
import { Tabs, type TabItem } from './Tabs'

// Feeds (no son categorías del API): Tendencia, Noticias y Nuevo, con icono,
// separados de las categorías por una línea vertical (estilo Polymarket).
// Cada feed tiene URL propia (/, /nuevo, /noticias) y SIEMPRE es un Link, se
// esté donde se esté: antes, fuera de la Home, Nuevo enlazaba a /mercados y
// parecía caer en "todos los mercados".
export const FEEDS = ['Tendencia', 'Noticias', 'Nuevo'] as const
export type Feed = (typeof FEEDS)[number]
const TABS = [...FEEDS, ...CATEGORIES] as const
export type CategoryTab = (typeof TABS)[number]
export const isFeed = (tab: string): tab is Feed => (FEEDS as readonly string[]).includes(tab)

// Barra de categorías estilo Polymarket: tabs de texto con subrayado, pegada
// bajo el navbar, con una línea inferior que no se mueve ("panel congelado").
// Dos modos para las CATEGORÍAS: con onChange filtran in-place (Home); sin
// onChange cada una es un Link a /mercados?cat= y el activo se lee de la URL
// (Perfil, Noticias). Los feeds son Links en ambos modos.
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
    const path = location.pathname
    if (path.startsWith('/noticias')) return 'Noticias'
    if (path === '/nuevo') return 'Nuevo'
    if (path === '/') return 'Tendencia'
    if (!path.startsWith('/mercados')) return null
    const cat = new URLSearchParams(location.search).get('cat')
    return cat && (CATEGORIES as readonly string[]).includes(cat) ? (cat as CategoryTab) : null
  })()

  const linkTo = (tab: CategoryTab) => {
    if (tab === 'Tendencia') return '/'
    if (tab === 'Nuevo') return '/nuevo'
    if (tab === 'Noticias') return '/noticias'
    return onChange ? undefined : `/mercados?cat=${encodeURIComponent(tab)}`
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
