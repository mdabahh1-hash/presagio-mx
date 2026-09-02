import { useEffect, useState } from 'react'

export const MOBILE_BREAKPOINT = 768

// true cuando el viewport es ≤768px (mismo corte que el CSS móvil de index.css).
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}
