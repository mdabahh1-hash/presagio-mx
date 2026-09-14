import { useEffect, useRef } from 'react'

// Holgura del canvas sobre el botón para que las partículas tengan dónde volar.
// Sin holgura lateral: el sheet móvil tiene overflow-y:auto y haría scroll horizontal.
const PAD_TOP = 90
const PAD_BOTTOM = 20
const COUNT = 40
const DURATION = 900

interface ConfettiBurstProps {
  // Se dispara cada vez que cambia (y es > 0)
  trigger: number
  // Tokens CSS (p. ej. '--green-fill'); se resuelven al disparar para respetar el tema
  colors: string[]
}

export function ConfettiBurst({ trigger, colors }: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!trigger || !canvas) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const root = getComputedStyle(document.documentElement)
    const palette = colors.map(c => root.getPropertyValue(c).trim()).filter(Boolean)
    if (!palette.length) return

    // Nacen del centro del botón y salen hacia arriba y hacia afuera
    const originX = w / 2
    const originY = h - PAD_BOTTOM - 24
    const particles = Array.from({ length: COUNT }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6
      const speed = 4 + Math.random() * 3
      return {
        x: originX + (Math.random() - 0.5) * w * 0.5,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: palette[Math.floor(Math.random() * palette.length)],
      }
    })

    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      const t = (now - start) / DURATION
      ctx.clearRect(0, 0, w, h)
      if (t >= 1) return
      ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
      for (const p of particles) {
        p.vy += 0.18
        p.vx *= 0.985
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.roundRect(-2, -3.5, 4, 7, 1)
        ctx.fill()
        ctx.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: 0, top: -PAD_TOP,
        width: '100%',
        height: `calc(100% + ${PAD_TOP + PAD_BOTTOM}px)`,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}
