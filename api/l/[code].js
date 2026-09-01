// Vercel serverless function: league-invite share page with Open Graph tags.
// Mismo patrón que api/m/[id].js: los crawlers (WhatsApp, X, Telegram) no
// ejecutan JS ni ven la ruta hash (`/#/l/:code`), así que los links de
// invitación apuntan a `/l/:code`; esta función sirve los OG tags con los
// datos públicos de la liga y redirige a los navegadores reales a la SPA.
// La exclusión de /api/ en el catch-all de vercel.json (fix 08-25) cubre esta
// ruta; el rewrite explícito /l/:code → /api/l/:code la activa.

const API_URL =
  process.env.API_URL ||
  process.env.VITE_API_URL ||
  'https://presagio-mx-backend-production-a30e.up.railway.app'

const SITE = 'https://veredikt.mx'
const DEFAULT_TITLE = 'Te invitaron a una liga en Veredikt'
const DEFAULT_DESC = 'Predicciones entre amigos. Gratis, con puntos.'

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function page({ code, title, description }) {
  const ogImage = `${SITE}/og-default.png`
  const appUrl = `/#/l/${encodeURIComponent(code)}`
  const canonical = `${SITE}/l/${encodeURIComponent(code)}`
  const t = esc(title)
  const desc = esc(description)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="${canonical}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="VEREDIKT" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${canonical}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${ogImage}" />

  <meta http-equiv="refresh" content="0; url=${appUrl}" />
  <script>location.replace(${JSON.stringify(appUrl)})</script>
</head>
<body>
  <p>Redirigiendo a <a href="${appUrl}">VEREDIKT</a>…</p>
</body>
</html>`
}

export default async function handler(req, res) {
  const { code } = req.query
  let title = DEFAULT_TITLE
  let description = DEFAULT_DESC

  try {
    const r = await fetch(`${API_URL}/api/leagues/invite/${encodeURIComponent(code)}`, {
      headers: { accept: 'application/json' },
    })
    if (r.ok) {
      const league = await r.json()
      if (league && league.name) {
        title = `Te invitaron a "${league.name}" en Veredikt`
        const cyclePart = league.cycle_name ? ` · ${league.cycle_name}` : ''
        description = `${league.member_count} dentro${cyclePart}. Éntrale, es gratis y con puntos.`
      }
    }
  } catch (_e) {
    // Network/backend error → fall back to generic OG tags below.
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
  res.status(200).send(page({ code, title, description }))
}
