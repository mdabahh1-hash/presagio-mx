import React from 'react'

// Avatar neutro: foto si hay, si no iniciales sobre --bg-elevated.
// (Antes: círculo con gradiente oro en cinco sitios distintos.)
export function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
}

interface AvatarProps {
  name: string
  url?: string | null
  size?: number
  style?: React.CSSProperties
  className?: string
}

export function Avatar({ name, url, size = 32, style, className = '' }: AvatarProps) {
  return (
    <div
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)), ...style }}
      aria-hidden={url ? undefined : true}
    >
      {url ? <img src={url} alt={name} /> : initialsOf(name)}
    </div>
  )
}
