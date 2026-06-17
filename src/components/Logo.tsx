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

export function LogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Logo size={28} />
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '1.2rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: '#F5F0E8',
          lineHeight: 1,
        }}
      >
        VEREDIKT
      </span>
    </div>
  )
}
