import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// Tabs de texto con subrayado (estilo Polymarket): sin píldoras, sin bordes.
// Con `onChange` son botones; con `to` en cada item son Links. El subrayado
// del activo (2px) pisa la línea inferior del contenedor (.tabs-line o
// .cat-tabs-sticky) para que la línea "no se mueva".
export interface TabItem<K extends string = string> {
  key: K
  label: React.ReactNode
  to?: string
  count?: number
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

  // El tab activo entra en vista en barras con scroll horizontal (móvil)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('.tab.active')
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [active])

  return (
    <div ref={ref} role="tablist" aria-label={ariaLabel} className={`tabs${size === 'sm' ? ' tabs-sm' : ''} ${className}`} style={style}>
      {items.map(item => {
        const isActive = item.key === active
        const inner = (
          <>
            {item.label}
            {item.count != null && <span className="tab-count">{item.count}</span>}
          </>
        )
        const cls = `tab${isActive ? ' active' : ''}`
        if (item.to && !onChange) {
          return (
            <Link key={item.key} to={item.to} role="tab" aria-selected={isActive} className={cls}>
              {inner}
            </Link>
          )
        }
        return (
          <button key={item.key} type="button" role="tab" aria-selected={isActive} className={cls} onClick={() => onChange?.(item.key)}>
            {inner}
          </button>
        )
      })}
    </div>
  )
}
