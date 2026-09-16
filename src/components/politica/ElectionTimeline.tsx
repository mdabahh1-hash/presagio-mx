import React from 'react'
import type { ApiHito } from '../../lib/api'
import { Icon } from '../Icon'

interface ElectionTimelineProps {
  titulo: string
  subtitulo?: string | null
  // Enlace a la fuente oficial del calendario (contenido curado); se muestra el host
  fuenteUrl?: string | null
  // Hitos curados (contenido_categorias), ascendentes por fecha; exactamente uno es `clave`
  hitos: ApiHito[]
  className?: string
}

// Las fechas del contenido son días en CDMX: sin la zona, un usuario en otro
// huso vería el punto cambiar de estado a otra hora.
const toTime = (fecha: string) => Date.parse(`${fecha}T00:00:00-06:00`)

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return url }
}

// Cronología electoral: riel con progreso (fracción del tiempo transcurrido
// entre el primer y el último hito) y un punto por hito. El hito clave (la
// jornada) es el único oro de la pantalla.
export function ElectionTimeline({ titulo, subtitulo, fuenteUrl, hitos, className = '' }: ElectionTimelineProps) {
  if (hitos.length < 2) return null
  const now = Date.now()
  const t0 = toTime(hitos[0].fecha)
  const tN = toTime(hitos[hitos.length - 1].fecha)
  const progress = tN > t0 ? Math.min(1, Math.max(0, (now - t0) / (tN - t0))) : 0

  return (
    <div className={`card ${className}`} style={{ padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h3 className="section-title" style={{ fontSize: 16 }}>{titulo}</h3>
        <span className="meta-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {subtitulo}
          {fuenteUrl && (
            <a
              href={fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}
            >
              {hostOf(fuenteUrl)}
              <Icon name="external" size={12} style={{ flexShrink: 0 }} />
            </a>
          )}
        </span>
      </div>
      <div className="pol-timeline-grid" style={{ gridTemplateColumns: `repeat(${hitos.length}, 1fr)` }}>
        <div className="pol-timeline-rail">
          <div className="pol-timeline-progress" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
        </div>
        {hitos.map(h => {
          const past = toTime(h.fecha) <= now
          const dot: React.CSSProperties = h.clave
            ? { background: 'var(--accent-fill)' }
            : past
              ? { background: 'var(--text-primary)' }
              : { background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)' }
          return (
            <div key={`${h.fecha}-${h.etiqueta}`} className="pol-timeline-hito" style={{ minWidth: 0 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', marginBottom: 12, position: 'relative', boxSizing: 'border-box', ...dot }} />
              <div className="num" style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{h.etiqueta}</div>
              <div className="meta-label" style={{ lineHeight: 1.4 }}>{h.texto}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
