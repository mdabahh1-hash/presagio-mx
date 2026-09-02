#!/usr/bin/env node
// Descarga los escudos/logos reales a public/img/markets/teams/<liga>/<slug>.png.
// Manual (no forma parte del build): `npm run logos` / `node scripts/fetch-team-logos.mjs [--dry] [--force]`.
// Fuentes: CDN de ESPN (Liga MX por id, NFL por abreviatura) y media.formula1.com
// (logos de escudería). Uso editorial dentro de la app; los archivos se commitean.
// Los slugs deben coincidir con src/lib/teamLogos.ts.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/img/markets/teams')
const DRY = process.argv.includes('--dry')
const FORCE = process.argv.includes('--force')

const ESPN_SOCCER = id => `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`
const ESPN_NFL = abbr => `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`
const F1 = (year, name) => `https://media.formula1.com/content/dam/fom-website/teams/${year}/${name}-logo.png`

/** @type {Record<string, Record<string, string | string[]>>} liga → slug → url(s) (se prueba en orden) */
const SOURCES = {
  'liga-mx': {
    america: ESPN_SOCCER(227), atlante: ESPN_SOCCER(226), atlas: ESPN_SOCCER(216), sanluis: ESPN_SOCCER(15720),
    cruzazul: ESPN_SOCCER(218), juarez: ESPN_SOCCER(17851), guadalajara: ESPN_SOCCER(219), leon: ESPN_SOCCER(228),
    monterrey: ESPN_SOCCER(220), necaxa: ESPN_SOCCER(229), pachuca: ESPN_SOCCER(234), puebla: ESPN_SOCCER(231),
    pumas: ESPN_SOCCER(233), queretaro: ESPN_SOCCER(222), santos: ESPN_SOCCER(225), tigres: ESPN_SOCCER(232),
    tijuana: ESPN_SOCCER(10125), toluca: ESPN_SOCCER(223),
  },
  nfl: Object.fromEntries(Object.entries({
    '49ers': 'sf', bears: 'chi', bengals: 'cin', bills: 'buf', broncos: 'den', browns: 'cle', buccaneers: 'tb',
    cardinals: 'ari', chargers: 'lac', chiefs: 'kc', colts: 'ind', commanders: 'wsh', cowboys: 'dal', dolphins: 'mia',
    eagles: 'phi', falcons: 'atl', giants: 'nyg', jaguars: 'jax', jets: 'nyj', lions: 'det', packers: 'gb',
    panthers: 'car', patriots: 'ne', raiders: 'lv', rams: 'lar', ravens: 'bal', saints: 'no', seahawks: 'sea',
    steelers: 'pit', texans: 'hou', titans: 'ten', vikings: 'min',
  }).map(([slug, abbr]) => [slug, ESPN_NFL(abbr)])),
  f1: {
    mercedes: [F1(2026, 'mercedes'), F1(2025, 'mercedes')],
    ferrari: [F1(2026, 'ferrari'), F1(2025, 'ferrari')],
    mclaren: [F1(2026, 'mclaren'), F1(2025, 'mclaren')],
    redbull: [F1(2026, 'red-bull-racing'), F1(2025, 'red-bull-racing')],
    williams: [F1(2026, 'williams'), F1(2025, 'williams')],
    racingbulls: [F1(2026, 'racing-bulls'), F1(2025, 'racing-bulls')],
    astonmartin: [F1(2026, 'aston-martin'), F1(2025, 'aston-martin')],
    alpine: [F1(2026, 'alpine'), F1(2025, 'alpine')],
    audi: [F1(2026, 'audi'), F1(2025, 'kick-sauber')],
    cadillac: [F1(2026, 'cadillac')],
    haas: [F1(2026, 'haas'), F1(2025, 'haas')],
  },
}

async function exists(p) { try { await access(p); return true } catch { return false } }

async function fetchFirst(urls) {
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'veredikt-logos/1.0' } })
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) return { url, buf: Buffer.from(await r.arrayBuffer()) }
    } catch { /* siguiente */ }
  }
  return null
}

let misses = 0, done = 0, skipped = 0
for (const [league, teams] of Object.entries(SOURCES)) {
  const dir = resolve(OUT, league)
  if (!DRY) await mkdir(dir, { recursive: true })
  for (const [slug, src] of Object.entries(teams)) {
    const dest = resolve(dir, `${slug}.png`)
    if (!FORCE && await exists(dest)) { skipped++; continue }
    const urls = Array.isArray(src) ? src : [src]
    if (DRY) { console.log(`[dry] ${league}/${slug} ← ${urls[0]}`); continue }
    const got = await fetchFirst(urls)
    if (!got) { console.log(`MISS ${league}/${slug} (${urls.join(' | ')})`); misses++; continue }
    await writeFile(dest, got.buf)
    done++
    console.log(`ok   ${league}/${slug}.png  ${(got.buf.length / 1024).toFixed(0)} KB  ← ${got.url}`)
  }
}
console.log(`\n${done} descargados, ${skipped} ya existían, ${misses} faltantes`)
process.exit(misses ? 1 : 0)
