import { useEffect, useState } from 'react'

// Milisegundos hasta endsAt, re-evaluado cada segundo (compartido por MarketCard y MarketRow).
export function useCountdown(endsAt: string) {
  const [diff, setDiff] = useState(() => new Date(endsAt).getTime() - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(endsAt).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [endsAt])
  return diff
}
