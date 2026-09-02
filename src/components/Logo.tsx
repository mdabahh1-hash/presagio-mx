import React from 'react'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 28, className = '' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="VEREDIKT"
      className={className}
      style={{ height: size, width: 'auto', display: 'block', objectFit: 'contain' }}
    />
  )
}

// Marca + wordmark. El logo es (junto al CTA primario) el único sitio con oro.
export function LogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Logo size={26} />
      <span
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        VEREDIKT
      </span>
    </div>
  )
}
