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
      {/* Aztec eye / sun hybrid mark */}
      <path d="M16 2L29 26H3L16 2Z" fill="url(#tri)" opacity="0.9" />
      <circle cx="16" cy="20" r="5" fill="url(#eye)" />
      <circle cx="16" cy="20" r="2" fill="#07070e" />
      <circle cx="16" cy="20" r="1" fill="#f0c040" />
      {/* Ray marks */}
      <path d="M16 3L17.5 7H14.5L16 3Z" fill="#f0c040" opacity="0.6" />
      <path d="M9 14L10.5 18H7.5L9 14Z" fill="#f0c040" opacity="0.3" transform="rotate(-30 9 14)" />
      <path d="M23 14L24.5 18H21.5L23 14Z" fill="#f0c040" opacity="0.3" transform="rotate(30 23 14)" />
      <defs>
        <linearGradient id="tri" x1="16" y1="2" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c94828" />
          <stop offset="1" stopColor="#7a1a08" />
        </linearGradient>
        <linearGradient id="eye" x1="11" y1="15" x2="21" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0c040" />
          <stop offset="1" stopColor="#c88820" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function LogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo size={28} />
      <span
        className="font-display text-xl font-800 tracking-wider"
        style={{ fontWeight: 800, letterSpacing: '0.12em', color: '#eeeef8' }}
      >
        PRESAGIO
      </span>
    </div>
  )
}
