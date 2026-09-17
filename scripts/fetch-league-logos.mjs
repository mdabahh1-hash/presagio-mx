#!/usr/bin/env node
// Descarga los LOGOS OFICIALES de liga a public/img/markets/sub/<liga>.png.
// Hermano de fetch-team-logos.mjs (escudos de club): misma fuente (CDN de ESPN),
// mismo estilo de uso manual y los archivos se commitean.
//
//   node scripts/fetch-league-logos.mjs [--dry] [--force]
//   package.json:  "logos:ligas": "node scripts/fetch-league-logos.mjs"
//
// Dos variantes por liga, porque el tema cambia el fondo:
//   <liga>.png        variante para fondo OSCURO (ESPN 500-dark)  → tema dark
//   <liga>-claro.png  variante a color        (ESPN 500)          → tema light
//
// Los slugs son los de SUBCATEGORY_IMAGE en src/lib/marketImage.ts. Tras correrlo,
// apuntar ese mapa al PNG y elegir variante por tema:
//
//   const LEAGUE_LOGO: Record<string, string> = {
//     'Liga MX': 'liga-mx', 'Premier League': 'premier-league', 'LaLiga': 'laliga',
//     'Serie A': 'serie-a', 'Bundesliga': 'bundesliga', 'Ligue 1': 'ligue-1',
//     'Liga Portugal': 'liga-portugal', 'MLS': 'mls', 'Champions League': 'champions-league',
//     'Leagues Cup': 'leagues-cup', 'Saudi Pro League': 'saudi-pro-league',
//     'NFL': 'nfl', 'F1': 'f1',
//   }
//   export function leagueLogo(sub?: string | null, theme: 'dark' | 'light' = 'dark') {
//     const slug = sub ? LEAGUE_LOGO[sub] : null
//     if (!slug) return sub ? SUBCATEGORY_IMAGE[sub] ?? null : null   // tile propio (.svg)
//     return `/img/markets/sub/${slug}${theme === 'light' ? '-claro' : ''}.png`
//   }
//
// Sin logo en la fuente (se quedan con el tile .svg de public/img/markets/sub/):
// Boxeo (no es liga) y Elecciones.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/img/markets/sub')
const DRY = process.argv.includes('--dry')
const FORCE = process.argv.includes('--force')

// Fútbol: id de competencia de ESPN. Ver
// https://site.api.espn.com/apis/site/v2/sports/soccer/<slug>/scoreboard (campo leagues[].id)
const SOCCER = id => ({
  dark: `https://a.espncdn.com/i/leaguelogos/soccer/500-dark/${id}.png`,
  claro: `https://a.espncdn.com/i/leaguelogos/soccer/500/${id}.png`,
})
// Ligas no-fútbol: por slug de ESPN
const LEAGUE = slug => ({
  dark: `https://a.espncdn.com/i/teamlogos/leagues/500-dark/${slug}.png`,
  claro: `https://a.espncdn.com/i/teamlogos/leagues/500/${slug}.png`,
})

/** @type {Record<string, {dark: string, claro: string}>} slug de archivo → urls */
const SOURCES = {
  'liga-mx': SOCCER(22),              // mex.1
  'premier-league': SOCCER(23),       // eng.1
  'laliga': SOCCER(15),               // esp.1
  'serie-a': SOCCER(12),              // ita.1
  'bundesliga': SOCCER(10),           // ger.1
  'ligue-1': SOCCER(9),               // fra.1
  'liga-portugal': SOCCER(14),        // por.1
  'mls': SOCCER(19),                  // usa.1
  'champions-league': SOCCER(2),      // uefa.champions
  'leagues-cup': SOCCER(2410),       // concacaf.leagues.cup
  'saudi-pro-league': SOCCER(2488),   // ksa.1
  'nfl': LEAGUE('nfl'),
  'f1': LEAGUE('f1'),
}

async function exists(p) { try { await access(p); return true } catch { return false } }

async function get(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'veredikt-logos/1.0' } })
    if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) return Buffer.from(await r.arrayBuffer())
  } catch { /* nada */ }
  return null
}

let misses = 0, done = 0, skipped = 0
if (!DRY) await mkdir(OUT, { recursive: true })

for (const [slug, urls] of Object.entries(SOURCES)) {
  for (const [variante, url] of Object.entries(urls)) {
    const file = `${slug}${variante === 'claro' ? '-claro' : ''}.png`
    const dest = resolve(OUT, file)
    if (!FORCE && await exists(dest)) { skipped++; continue }
    if (DRY) { console.log(`[dry] ${file} ← ${url}`); continue }
    const buf = await get(url)
    if (!buf) { console.log(`MISS ${file} (${url})`); misses++; continue }
    await writeFile(dest, buf)
    done++
    console.log(`ok   ${file}  ${(buf.length / 1024).toFixed(0)} KB  ← ${url}`)
  }
}
console.log(`\n${done} descargados, ${skipped} ya existían, ${misses} faltantes`)
console.log('Sin logo oficial en la fuente (siguen con tile .svg): Boxeo, Elecciones')
process.exit(misses ? 1 : 0)
