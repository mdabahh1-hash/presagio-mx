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
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* V mark — two bold strokes meeting at a point */}
      <path
        d="M4 6 L16 26 L28 6"
        stroke="#FFD700"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner accent dot at vertex */}
      <circle cx="16" cy="26" r="1.5" fill="#FFD700" opacity="0.6" />
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
