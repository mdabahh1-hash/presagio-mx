import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

// Tabs de texto con subrayado (estilo Polymarket): sin píldoras, sin bordes.
// Un item con `to` es un Link (aunque haya `onChange`: así "Noticias" navega
// desde la Home, que filtra el resto in-place); sin `to` es un botón. El subrayado
// del activo (2px) pisa la línea inferior del contenedor (.tabs-line o
// .cat-tabs-sticky) para que la línea "no se mueva". `icon` va a la izquierda
// del texto; `divider` pinta una línea vertical ANTES del item (separa los
// feeds Tendencia/Nuevo de las categorías).
export interface TabItem<K extends string = string> {
  key: K
  label: React.ReactNode
  to?: string
  count?: number
  icon?: IconName
  divider?: boolean
}

interface TabsProps<K extends string> {
  items: TabItem<K>[]
  active?: K | null
  onChange?: (key: K) => void
  size?: 'md' | 'sm'
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

export function Tabs<K extends string>({ items, active, onChange, size = 'md', ariaLabel, className = '', style }: TabsProps<K>) {
  const ref = useRef<HTMLDivElement>(null)

  // El tab activo entra en vista en barras con scroll horizontal (móvil). Solo se
  // desplaza el contenedor: scrollIntoView también movía la página verticalmente
  // cuando la barra estaba fuera del viewport (jornada de la landing de Deportes).
  useEffect(() => {
    const c = ref.current
    const el = c?.querySelector<HTMLElement>('.tab.active')
    if (!c || !el) return
    const cr = c.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    if (er.left < cr.left) c.scrollBy({ left: er.left - cr.left })
    else if (er.right > cr.right) c.scrollBy({ left: er.right - cr.right })
  }, [active])

  return (
    <div ref={ref} role="tablist" aria-label={ariaLabel} className={`tabs${size === 'sm' ? ' tabs-sm' : ''} ${className}`} style={style}>
      {items.map(item => {
        const isActive = item.key === active
        const inner = (
          <>
            {item.icon && <Icon name={item.icon} size={14} />}
            {item.label}
            {item.count != null && <span className="tab-count">{item.count}</span>}
          </>
        )
        const cls = `tab${isActive ? ' active' : ''}`
        const divider = item.divider ? <span className="tab-divider" aria-hidden /> : null
        if (item.to) {
          return (
            <React.Fragment key={item.key}>
              {divider}
              <Link to={item.to} role="tab" aria-selected={isActive} className={cls}>
                {inner}
              </Link>
            </React.Fragment>
          )
        }
        return (
          <React.Fragment key={item.key}>
            {divider}
            <button type="button" role="tab" aria-selected={isActive} className={cls} onClick={() => onChange?.(item.key)}>
              {inner}
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}
