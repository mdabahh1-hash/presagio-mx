import React from 'react'
import { Icon } from '../Icon'
import { hasLeagueLogo, leagueLogo, subcategoryIcon } from '../../lib/marketImage'
import { useTheme } from '../../lib/ThemeContext'

// Logo oficial de la liga (variante por tema) o, sin logo (Boxeo), un tile con el icono del deporte.
export function LeagueMark({ sub, size = 34, radius = 7 }: { sub: string; size?: number; radius?: number }) {
  const { resolved } = useTheme()
  if (hasLeagueLogo(sub)) {
    return (
      <img
        src={leagueLogo(sub, resolved) ?? undefined}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0 }}
      />
    )
  }
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: radius, background: 'var(--bg-elevated)',
        boxShadow: 'inset 0 0 0 1px var(--border-subtle)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0,
      }}
    >
      <Icon name={subcategoryIcon(sub, 'Deportes')} size={Math.round(size * 0.6)} />
    </div>
  )
}
