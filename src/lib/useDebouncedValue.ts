import { useEffect, useState } from 'react'

// Returns `value` after it has stayed unchanged for `delayMs`.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

// Returns `value` throttled to at most one update per `intervalMs`: an update
// arriving inside the window is deferred and applied ONCE at the window's end
// with the latest value (no queueing of intermediate ticks).
export function useThrottledValue<T>(value: T, intervalMs = 2000): T {
  const [throttled, setThrottled] = useState(value)
  const [lastApplied, setLastApplied] = useState(() => Date.now())
  useEffect(() => {
    const elapsed = Date.now() - lastApplied
    if (elapsed >= intervalMs) {
      setThrottled(value)
      setLastApplied(Date.now())
      return
    }
    const t = setTimeout(() => {
      setThrottled(value)
      setLastApplied(Date.now())
    }, intervalMs - elapsed)
    return () => clearTimeout(t)
  }, [value, intervalMs])  // eslint-disable-line react-hooks/exhaustive-deps
  return throttled
}
