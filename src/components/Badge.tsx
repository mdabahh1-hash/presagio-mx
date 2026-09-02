import React from 'react'
import { Icon, type IconName } from './Icon'

// Etiqueta pequeña sin borde ni mayúsculas forzadas. Sustituye a la receta
// copiada en ~12 sitios (0.6rem / uppercase / tracking / radius 99 / borde).
interface BadgeProps {
  tone?: 'neutral' | 'green' | 'red' | 'accent' | 'category'
  // tone="category": color de texto + fondo suave (getCategoryColor/getCategoryBg)
  color?: string
  bg?: string
  icon?: IconName
  title?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export function Badge({ tone = 'neutral', color, bg, icon, title, style, children }: BadgeProps) {
  const cls = tone === 'green' ? 'badge badge-green'
    : tone === 'red' ? 'badge badge-red'
    : tone === 'accent' ? 'badge badge-accent'
    : 'badge'
  const catStyle = tone === 'category' ? { color, background: bg } : {}
  return (
    <span className={cls} title={title} style={{ ...catStyle, ...style }}>
      {icon && <Icon name={icon} size={12} strokeWidth={2} />}
      {children}
    </span>
  )
}
