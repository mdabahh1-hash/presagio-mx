#!/usr/bin/env node
// Descarga caras de personas a public/img/markets/people/<grupo>/<slug>.png,
// normalizadas a PNG cuadrado 256×256 (recorte centrado en la zona de interés).
// Manual (no forma parte del build): `npm run photos` / `node scripts/fetch-people-photos.mjs [--dry] [--force]`.
// Fuentes:
//   nfl    → headshots de ESPN por id de jugador (ids: site.web.api.espn.com/apis/common/v3/search?query=…&type=player)
//   f1     → media.formula1.com por código de piloto (fallback: foto de temporada anterior, luego Wikipedia)
//   futbol → Wikipedia (imagen principal del artículo en en.wikipedia.org, alojada en Wikimedia Commons)
//   boxeo  → Wikipedia
// ESPN/F1: uso editorial dentro de la app, igual que los escudos. Wikimedia: licencias CC
// (BY / BY-SA) que exigen atribución → se escribe people/CREDITS.md con autor y licencia.
// Los slugs deben coincidir con src/lib/peoplePhotos.ts.
import { mkdir, writeFile, access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/img/markets/people')
const CREDITS = resolve(OUT, 'CREDITS.md')
const DRY = process.argv.includes('--dry')
const FORCE = process.argv.includes('--force')
const UA = 'veredikt-photos/1.0 (https://veredikt.mx)'
const SIZE = 256
const MIN_BYTES = 10 * 1024 // media.formula1.com devuelve un placeholder de ~2 KB cuando no hay foto

const ESPN_NFL = id => ({ url: `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png` })
const F1 = (code, name) => ({
  url: `https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/${code[0]}/${code}_${name}/${code.toLowerCase()}.png`,
})
const F1_SEASON = (year, surname) => ({ url: `https://media.formula1.com/content/dam/fom-website/drivers/${year}Drivers/${surname}.jpg` })
const WIKI = title => ({ wiki: title })

/** @type {Record<string, Record<string, object | object[]>>} grupo → slug → fuente(s), se prueban en orden */
const SOURCES = {
  nfl: Object.fromEntries(Object.entries({
    hutchinson: 4372099, mesidor: 4429190, stbrown: 4374302, reese: 4950400, bijan: 4430807, breecehall: 4427366,
    burns: 4035631, bthomas: 4432773, downs: 4870706, tate: 4871023, lamb: 4241389, mccaffrey: 3117251,
    bailey: 4685248, achane: 4429160, henry: 3043078, london: 4426502, maye: 4431452, mendoza: 4837248,
    chase: 4362628, jrodriguez: 4566094, jprice: 4685512, gibbs: 4429795, hurts: 4040715, jcook: 4379399,
    goff: 3046779, jsn: 4430878, daniels: 4426348, waddle: 4372016, love: 4870808, burrow: 3915511,
    jtaylor: 4242335, allen: 3918298, jacobs: 4047365, herbert: 4038941, jefferson: 4262921, lamar: 3916387,
    lemon: 4870795, nabers: 4595348, delane: 4880124, stafford: 12483, crosby: 3916655, garrett: 3122132,
    bosa: 4040605, collins: 4258173, bonitto: 4360259, mahomes: 3139477, nacua: 4426515, bain: 4870617,
    laporta: 4430027, barkley: 3929630, styles: 5081807, watt: 3045282, mclaurin: 3121422, anderson: 4685724,
    stribling: 4710714, concepcion: 4870653, beck: 4430841,
  }).map(([slug, id]) => [slug, ESPN_NFL(id)])),
  f1: {
    verstappen: [F1('MAXVER01', 'Max_Verstappen'), F1_SEASON(2025, 'verstappen')],
    norris:     [F1('LANNOR01', 'Lando_Norris'), F1_SEASON(2025, 'norris')],
    piastri:    [F1('OSCPIA01', 'Oscar_Piastri'), F1_SEASON(2025, 'piastri')],
    leclerc:    [F1('CHALEC01', 'Charles_Leclerc'), F1_SEASON(2025, 'leclerc')],
    hamilton:   [F1('LEWHAM01', 'Lewis_Hamilton'), F1_SEASON(2025, 'hamilton')],
    russell:    [F1('GEORUS01', 'George_Russell'), F1_SEASON(2025, 'russell')],
    antonelli:  [F1('ANDANT01', 'Kimi_Antonelli'), F1_SEASON(2025, 'antonelli'), WIKI('Kimi Antonelli')],
    sainz:      [F1('CARSAI01', 'Carlos_Sainz'), F1_SEASON(2025, 'sainz'), WIKI('Carlos Sainz Jr.')],
    albon:      [F1('ALEALB01', 'Alexander_Albon'), F1_SEASON(2025, 'albon')],
    alonso:     [F1('FERALO01', 'Fernando_Alonso'), F1_SEASON(2025, 'alonso')],
    stroll:     [F1('LANSTR01', 'Lance_Stroll'), F1_SEASON(2025, 'stroll')],
    gasly:      [F1('PIEGAS01', 'Pierre_Gasly'), F1_SEASON(2025, 'gasly')],
    colapinto:  [F1('FRACOL01', 'Franco_Colapinto'), WIKI('Franco Colapinto')],
    hulkenberg: [F1('NICHUL01', 'Nico_Hulkenberg'), F1_SEASON(2025, 'hulkenberg')],
    bortoleto:  [F1('GABBOR01', 'Gabriel_Bortoleto'), F1_SEASON(2025, 'bortoleto')],
    ocon:       [F1('ESTOCO01', 'Esteban_Ocon'), F1_SEASON(2025, 'ocon')],
    bearman:    [F1('OLIBEA01', 'Oliver_Bearman'), F1_SEASON(2025, 'bearman')],
    hadjar:     [F1('ISAHAD01', 'Isack_Hadjar'), F1_SEASON(2025, 'hadjar')],
    lawson:     [F1('LIALAW01', 'Liam_Lawson'), F1_SEASON(2025, 'lawson')],
    lindblad:   [F1('ARVLIN01', 'Arvid_Lindblad'), WIKI('Arvid Lindblad')],
    perez:      [F1('SERPER01', 'Sergio_Perez'), WIKI('Sergio Pérez')],
    bottas:     [F1('VALBOT01', 'Valtteri_Bottas'), WIKI('Valtteri Bottas')],
  },
  futbol: {
    messi: WIKI('Lionel Messi'), mbappe: WIKI('Kylian Mbappé'), kane: WIKI('Harry Kane'),
    oyarzabal: WIKI('Mikel Oyarzabal'), haaland: WIKI('Erling Haaland'), yamal: WIKI('Lamine Yamal'),
    vinicius: WIKI('Vinícius Júnior'), olise: WIKI('Michael Olise'), bellingham: WIKI('Jude Bellingham'),
    pedri: WIKI('Pedri'), kvaratskhelia: WIKI('Khvicha Kvaratskhelia'), julianalvarez: WIKI('Julián Álvarez'),
    dembele: WIKI('Ousmane Dembélé'), luisdiaz: WIKI('Luis Díaz (footballer, born 1997)'),
    osimhen: WIKI('Victor Osimhen'), ferminlopez: WIKI('Fermín López'), dimarco: WIKI('Federico Dimarco'),
    fidalgo: WIKI('Álvaro Fidalgo'), cherki: WIKI('Rayan Cherki'), yoro: WIKI('Leny Yoro'), rodri: WIKI('Rodri'),
    diomande: WIKI('Yan Diomande'), lenormand: WIKI('Robin Le Normand'), wirtz: WIKI('Florian Wirtz'),
    fabianruiz: WIKI('Fabián Ruiz'), gnabry: WIKI('Serge Gnabry'), bernardosilva: WIKI('Bernardo Silva'),
    ardaguler: WIKI('Arda Güler'), gakpo: WIKI('Cody Gakpo'), kovacic: WIKI('Mateo Kovačić'),
  },
  boxeo: {
    canelo: WIKI('Canelo Álvarez'),
    mbilli: WIKI('Christian Mbilli'),
  },
}

async function exists(p) { try { await access(p); return true } catch { return false } }

async function getJson(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

async function getImage(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA } })
  if (!r.ok || !(r.headers.get('content-type') || '').startsWith('image/')) return null
  const buf = Buffer.from(await r.arrayBuffer())
  return buf.length >= MIN_BYTES ? buf : null
}

const stripTags = s => (s || '').replace(/<[^>]+>/g, '').trim()

/** Imagen principal del artículo + metadatos de licencia desde Commons. */
async function resolveWiki(title) {
  const d = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
  const src = d.originalimage?.source
  if (!src) return null
  const file = decodeURIComponent(src.split('/').pop().split('?')[0])
  let credit = { file, license: '?', author: '?', page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}` }
  try {
    const c = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent('File:' + file)}&prop=imageinfo&iiprop=extmetadata&format=json`)
    const em = Object.values(c.query.pages)[0]?.imageinfo?.[0]?.extmetadata || {}
    credit = { ...credit, license: em.LicenseShortName?.value || '?', author: stripTags(em.Artist?.value) || '?' }
  } catch { /* sin metadatos */ }
  return { url: src.split('?')[0], credit }
}

async function fetchFirst(sources) {
  for (const s of sources) {
    try {
      if (s.wiki) {
        const w = await resolveWiki(s.wiki)
        if (!w) continue
        const buf = await getImage(w.url)
        if (buf) return { url: w.url, buf, credit: w.credit }
      } else {
        const buf = await getImage(s.url)
        if (buf) return { url: s.url, buf }
      }
    } catch { /* siguiente */ }
  }
  return null
}

// Headshots (ESPN/F1) ya vienen centrados en la cara: recorte por zona de interés.
// Fotos de Wikipedia son de cuerpo entero/medio: en vertical la cara está en el
// cuadrado superior; en horizontal, zona de interés (la cara suele dominar).
async function toSquarePng(buf, fromWiki) {
  const img = sharp(buf).rotate()
  const { width = 0, height = 0 } = await img.metadata()
  const position = fromWiki && height >= width ? 'top' : 'attention'
  return img.resize(SIZE, SIZE, { fit: 'cover', position }).png().toBuffer()
}

// CREDITS.md: se conserva lo ya escrito y se reemplaza la línea de cada slug procesado.
const credits = new Map()
if (await exists(CREDITS)) {
  for (const line of (await readFile(CREDITS, 'utf8')).split('\n')) {
    const m = /^- `([^`]+)`/.exec(line)
    if (m) credits.set(m[1], line)
  }
}

let misses = 0, done = 0, skipped = 0
for (const [group, people] of Object.entries(SOURCES)) {
  const dir = resolve(OUT, group)
  if (!DRY) await mkdir(dir, { recursive: true })
  for (const [slug, src] of Object.entries(people)) {
    const dest = resolve(dir, `${slug}.png`)
    if (!FORCE && await exists(dest)) { skipped++; continue }
    const sources = Array.isArray(src) ? src : [src]
    if (DRY) { console.log(`[dry] ${group}/${slug} ← ${sources.map(s => s.wiki ? `wiki:${s.wiki}` : s.url).join(' | ')}`); continue }
    const got = await fetchFirst(sources)
    if (!got) { console.log(`MISS ${group}/${slug}`); misses++; continue }
    const png = await toSquarePng(got.buf, !!got.credit)
    await writeFile(dest, png)
    const key = `${group}/${slug}.png`
    if (got.credit) {
      const c = got.credit
      credits.set(key, `- \`${key}\` — [${c.file}](${c.page}) · ${c.author} · ${c.license}`)
    } else {
      credits.set(key, `- \`${key}\` — ${got.url} · uso editorial`)
    }
    done++
    console.log(`ok   ${key}  ${(png.length / 1024).toFixed(0)} KB  ← ${got.url}`)
  }
}

if (!DRY) {
  const body = [
    '# Créditos de fotos de personas',
    '',
    'Generado por `scripts/fetch-people-photos.mjs`. Las fotos de Wikimedia Commons se usan bajo su licencia',
    'Creative Commons (se indica autor y licencia); las de ESPN / Formula 1 se usan con fines editoriales dentro de la app.',
    '',
    ...[...credits.keys()].sort().map(k => credits.get(k)),
    '',
  ].join('\n')
  await writeFile(CREDITS, body)
}
console.log(`\n${done} descargadas, ${skipped} ya existían, ${misses} faltantes`)
process.exit(misses ? 1 : 0)
