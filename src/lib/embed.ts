// Snippet "Insertar" para incrustar un mercado en cualquier sitio.
// Misma receta que los embeds de Polymarket: JSON-LD (SEO) + iframe + enlace
// invisible sobre el logo + figcaption oculto para lectores de pantalla.

import type { ApiMarket } from './api'

export const SITE = 'https://veredikt.mx'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function embedUrl(id: string, ref?: string | null): string {
  const q = new URLSearchParams()
  if (ref) q.set('ref', ref)
  const qs = q.toString()
  return `${SITE}/embed/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`
}

export function buildEmbedSnippet(m: ApiMarket, yesPrice: number, opts: { ref?: string | null; width?: number; height?: number } = {}): string {
  const { ref, width = 400, height = 320 } = opts
  const marketUrl = `${SITE}/m/${encodeURIComponent(m.id)}`
  const src = embedUrl(m.id, ref)
  const sorted = [...(m.outcomes ?? [])].sort((a, b) => b.price - a.price)
  const oddsText = m.market_type === 'multi'
    ? sorted.slice(0, 3).map(o => `${o.label} ${Math.round(o.price)}%`).join(' · ')
    : `SÍ ${Math.round(yesPrice)}% · NO ${Math.round(100 - yesPrice)}%`
  const description = m.market_type === 'multi' && sorted[0]
    ? `Probabilidades en vivo en VEREDIKT. ${sorted[0].label} lidera con ${Math.round(sorted[0].price)}%.`
    : `Probabilidades en vivo en VEREDIKT. El mercado da ${Math.round(yesPrice)}% al SÍ.`

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: m.question,
    description,
    startDate: m.created_at,
    endDate: m.ends_at,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: marketUrl },
    url: marketUrl,
    organizer: { '@type': 'Organization', name: 'VEREDIKT', url: SITE },
  }

  const q = esc(m.question)
  return `<script type="application/ld+json">
${JSON.stringify(ld, null, 2).replace(/<\//g, '<\\/')}
</script>
<figure
  class="veredikt-embed"
  id="veredikt-${esc(m.id)}"
  aria-label="Mercado de predicción VEREDIKT: ${q}"
  itemscope
  itemtype="https://schema.org/Event"
  style="position:relative;display:inline-block;margin:0;max-width:100%">
  <iframe
    title="${q} — Probabilidades en vivo en VEREDIKT"
    src="${src}"
    width="${width}"
    height="${height}"
    frameborder="0"
    loading="lazy"
    style="border:0;border-radius:16px;max-width:100%"
    allowtransparency="true">
  </iframe>
  <a href="${marketUrl}"
    aria-label="Ver en VEREDIKT"
    target="_blank"
    rel="noopener"
    style="position:absolute;top:14px;left:18px;width:120px;height:28px;z-index:10">
  </a>
  <figcaption style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">
    <strong>${q} — Mercado de predicción en vivo</strong><br>
    Probabilidades actuales: ${esc(oddsText)} · ${esc(m.category)}<br>
    <a href="${marketUrl}">Ver el mercado completo y predecir en VEREDIKT</a>
  </figcaption>
</figure>`
}
