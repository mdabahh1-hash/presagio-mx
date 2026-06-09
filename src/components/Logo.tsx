import React from 'react'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 28, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10 24 L46 90 L90 8"
        stroke="#FFD700"
        strokeWidth="17"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      />
    </svg>
  )
}

export function LogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
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
