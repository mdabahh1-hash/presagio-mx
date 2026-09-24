import { useTranslation } from 'react-i18next'
import { useElementWidth } from '../../lib/useElementWidth'
import { probText } from '../../lib/prices'
import { medianaImplicita, type Escalera } from './escalera'

const H = 220
const PAD = { l: 40, r: 32, t: 16, b: 32 }
const usd = (v: number) => `US$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v)}`

// Curva de precio implícito: probabilidad de cerrar arriba de cada peldaño de la
// escalera (x por peldaño, no a escala) y la mediana donde cruza el 50 %.
export function CurvaImplicita({ escalera }: { escalera: Escalera }) {
  const { t } = useTranslation()
  const [ref, width] = useElementWidth()
  const W = width || 520
  const { peldanos } = escalera
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (peldanos.length === 1 ? cW / 2 : (i / (peldanos.length - 1)) * cW)
  const y = (p: number) => PAD.t + cH - (p / 100) * cH
  const pts = peldanos.map((p, i) => [x(i), y(p.market.yesPrice)] as const)
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${y(0)} L${pts[0][0].toFixed(1)},${y(0)} Z`

  const mediana = medianaImplicita(peldanos)
  // Posición x de la mediana: interpolada entre los índices de los peldaños que la rodean
  let medX: number | null = null
  if (mediana !== null) {
    const i = peldanos.findIndex(p => p.valor >= mediana)
    const a = peldanos[i - 1], b = peldanos[i]
    medX = a && b ? x(i - 1) + ((mediana - a.valor) / (b.valor - a.valor)) * (x(i) - x(i - 1)) : null
  }

  return (
    <section className="card" style={{ padding: '16px 18px', minWidth: 0 }}>
      <h2 className="section-title">{t('crypto.curvaTitle', { sub: escalera.sub })}</h2>
      <p className="meta-label" style={{ margin: '2px 0 8px' }}>
        {mediana !== null ? t('crypto.curvaMediana', { precio: usd(mediana) }) : t('crypto.curvaSub')}
      </p>
      <div ref={ref} style={{ minWidth: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={t('crypto.curvaTitle', { sub: escalera.sub })}>
          {[0, 50, 100].map(v => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--border-subtle)" strokeDasharray={v === 50 ? '4 4' : undefined} />
              <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-tertiary)">{v}%</text>
            </g>
          ))}
          <path d={area} fill="var(--text-primary)" opacity={0.06} />
          <path d={line} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinejoin="round" />
          {medX !== null && <line x1={medX} x2={medX} y1={PAD.t} y2={y(0)} stroke="var(--text-secondary)" strokeDasharray="3 3" />}
          {pts.map(([px, py], i) => (
            <g key={peldanos[i].market.id}>
              <circle cx={px} cy={py} r={4} fill="var(--bg-surface)" stroke="var(--text-primary)" strokeWidth={2}>
                <title>{`${peldanos[i].label}: ${probText(peldanos[i].market.yesPrice, peldanos[i].market.status)}`}</title>
              </circle>
              <text x={px} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)">{usd(peldanos[i].valor)}</text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
