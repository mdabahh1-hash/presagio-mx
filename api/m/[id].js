// Vercel serverless function: per-market share page with Open Graph tags.
//
// Social crawlers (WhatsApp, X, Telegram, Discord) do NOT execute JS and do NOT
// see the SPA's hash route (`/#/mercado/:id`). They only fetch a plain URL.
// So share links point at `/m/:id`, which this function serves: it fetches the
// market from the backend, returns HTML with proper OG meta tags for the crawler,
// and redirects real browsers into the SPA hash route.

const API_URL =
  process.env.API_URL ||
  process.env.VITE_API_URL ||
  'https://presagio-mx-backend-production-a30e.up.railway.app'

const SITE = 'https://veredikt.mx'
const DEFAULT_DESC = 'Predice en VEREDIKT — el veredicto del mercado.'

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function page({ id, title, description }) {
  const ogImage = `${SITE}/og-default.png`
  const appUrl = `/#/mercado/${encodeURIComponent(id)}`
  const canonical = `${SITE}/m/${encodeURIComponent(id)}`
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
  const { id } = req.query
  let title = 'VEREDIKT — El veredicto del mercado.'
  let description = DEFAULT_DESC

  try {
    const r = await fetch(`${API_URL}/api/markets/${encodeURIComponent(id)}`, {
      headers: { accept: 'application/json' },
    })
    if (r.ok) {
      const m = await r.json()
      if (m && m.question) {
        title = `${m.question} — VEREDIKT`
        if (m.description) description = m.description
      }
    }
  } catch (_e) {
    // Network/backend error → fall back to generic OG tags below.
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Cache at the edge so repeated crawler hits don't re-fetch the backend.
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
  res.status(200).send(page({ id, title, description }))
}
