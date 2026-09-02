// Generador de cards de resultado para Ligas Privadas (Canvas, sin deps).
// Formatos: 'feed' 1080x1350 (Instagram/WhatsApp) y 'og' 1200x630. Look
// neutro (fondo casi negro, acento oro solo en cifras clave), tipografía Inter.

export interface PodiumEntry {
  name: string
  points: string // ya formateado, p. ej. "12,000"
  hits: string // "3/4"
}

export interface ResultCardData {
  leagueName: string
  cycleName: string
  podium: PodiumEntry[] // top 3, orden 1º→3º
  footer: string // p. ej. "veredikt.mx"
}

const BG = '#0B0B0C'
const SURFACE = '#1C1C1F'
const BORDER = 'rgba(255,255,255,0.12)'
const TEXT = '#F2F2F2'
const MUTED = 'rgba(255,255,255,0.62)'
const GOLD = '#F5C518'
const MEDALS = ['#F5C518', '#B8BCC6', '#C98A4B']

export async function generateResultCard(
  data: ResultCardData,
  format: 'feed' | 'og' = 'feed',
): Promise<Blob> {
  // La fuente debe estar cargada antes de dibujar; si no, el canvas cae a system-ui.
  try { await Promise.all([document.fonts.load('700 40px Inter'), document.fonts.load('600 30px Inter')]) } catch { /* sin FontFace API */ }

  const W = format === 'feed' ? 1080 : 1200
  const H = format === 'feed' ? 1350 : 630
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d unsupported')

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)

  const cx = W / 2
  const scale = format === 'feed' ? 1 : 0.72
  const font = (weight: number, px: number) =>
    `${weight} ${Math.round(px * scale)}px Inter, system-ui, sans-serif`

  // encabezado: liga + ciclo
  ctx.textAlign = 'center'
  ctx.fillStyle = MUTED
  ctx.font = font(600, 30)
  ctx.fillText('Liga privada', cx, (format === 'feed' ? 120 : 80))
  ctx.fillStyle = TEXT
  ctx.font = font(700, 64)
  ctx.fillText(clip(ctx, data.leagueName, W - 120), cx, (format === 'feed' ? 200 : 150))
  ctx.fillStyle = MUTED
  ctx.font = font(500, 40)
  ctx.fillText(clip(ctx, data.cycleName, W - 160), cx, (format === 'feed' ? 268 : 210))

  // podio 2-1-3
  const slotW = Math.min(300 * scale, (W - 160) / 3)
  const gap = 24 * scale
  const baseY = format === 'feed' ? H - 420 : H - 150
  const heights = [300 * scale, 380 * scale, 250 * scale] // 2º, 1º, 3º
  const order = [1, 0, 2] // índice en data.podium por columna
  const startX = cx - (slotW * 1.5 + gap)

  order.forEach((podiumIdx, col) => {
    const s = data.podium[podiumIdx]
    const x = startX + col * (slotW + gap)
    const h = heights[col]
    const y = baseY - h

    roundRect(ctx, x, y, slotW, h, 16 * scale)
    ctx.fillStyle = SURFACE
    ctx.fill()
    ctx.strokeStyle = BORDER
    ctx.lineWidth = 2
    ctx.stroke()
    if (!s) return

    const mx = x + slotW / 2
    ctx.fillStyle = MEDALS[podiumIdx]
    ctx.font = font(700, 40)
    ctx.fillText(`${podiumIdx + 1}º`, mx, y + 64 * scale)
    ctx.fillStyle = TEXT
    ctx.font = font(600, 34)
    ctx.fillText(clip(ctx, s.name, slotW - 32), mx, y + 124 * scale)
    ctx.fillStyle = podiumIdx === 0 ? GOLD : TEXT
    ctx.font = font(700, 40)
    ctx.fillText(`${s.points} pts`, mx, y + 182 * scale)
    ctx.fillStyle = MUTED
    ctx.font = font(500, 28)
    ctx.fillText(s.hits, mx, y + 228 * scale)
  })

  // branding discreto
  ctx.fillStyle = TEXT
  ctx.font = font(700, 40)
  ctx.fillText('VEREDIKT', cx, H - (format === 'feed' ? 160 : 60) + 40 * scale)
  ctx.fillStyle = MUTED
  ctx.font = font(500, 28)
  ctx.fillText(data.footer, cx, H - (format === 'feed' ? 100 : 60) + 40 * scale)

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t}…`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
