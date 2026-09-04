#!/usr/bin/env node
// Descarga los escudos/logos reales a public/img/markets/teams/<liga>/<slug>.png.
// Manual (no forma parte del build): `npm run logos` / `node scripts/fetch-team-logos.mjs [--dry] [--force]`.
// Fuentes: CDN de ESPN (fútbol por id numérico, NFL por abreviatura) y media.formula1.com
// (logos de escudería). Uso editorial dentro de la app; los archivos se commitean.
// Los slugs deben coincidir con src/lib/teamLogos.ts.
// Ids de ESPN: https://site.api.espn.com/apis/site/v2/sports/soccer/<eng.1|esp.1|ita.1|ger.1|fra.1|por.1|usa.1|ksa.1|uefa.champions>/teams
// Champions League tiene carpeta propia (repite clubes de ligas domésticas) para que
// cada liga se resuelva con un solo índice. Caras de personas: scripts/fetch-people-photos.mjs.
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
  ...Object.fromEntries(Object.entries({
    'premier-league': {
      arsenal: 359, astonvilla: 362, bournemouth: 349, brentford: 337, brighton: 331, chelsea: 363, coventry: 388,
      crystalpalace: 384, everton: 368, fulham: 370, hull: 306, ipswich: 373, leeds: 357, liverpool: 364, mancity: 382,
      manutd: 360, newcastle: 361, forest: 393, sunderland: 366, tottenham: 367,
    },
    laliga: {
      alaves: 96, athletic: 93, atletico: 1068, barcelona: 83, celta: 85, deportivo: 90, elche: 3751, espanyol: 88,
      getafe: 2922, levante: 1538, malaga: 99, osasuna: 97, racing: 87, rayo: 101, betis: 244, realmadrid: 86,
      realsociedad: 89, sevilla: 243, valencia: 94, villarreal: 102,
    },
    'serie-a': {
      milan: 103, roma: 104, atalanta: 105, bologna: 107, cagliari: 2925, como: 2572, fiorentina: 109, frosinone: 4057,
      genoa: 3263, inter: 110, juventus: 111, lazio: 112, lecce: 113, monza: 4007, napoli: 114, parma: 115,
      sassuolo: 3997, torino: 239, udinese: 118, venezia: 17530,
    },
    bundesliga: {
      unionberlin: 598, leverkusen: 131, bayern: 132, dortmund: 124, gladbach: 268, frankfurt: 125, augsburg: 3841,
      koln: 122, hamburg: 127, mainz: 2950, leipzig: 11420, freiburg: 126, paderborn: 3307, elversberg: 10388,
      schalke: 133, hoffenheim: 7911, stuttgart: 134, bremen: 137,
    },
    'ligue-1': {
      auxerre: 172, monaco: 174, angers: 7868, brest: 6997, lehavre: 3236, lemans: 2697, lens: 175, lille: 166,
      lorient: 273, lyon: 167, marseille: 176, nice: 2502, parisfc: 6851, psg: 160, rennes: 169, strasbourg: 180,
      toulouse: 179, troyes: 170,
    },
    'liga-portugal': {
      viseu: 21607, alverca: 21613, arouca: 15784, benfica: 1929, braga: 2994, nacional: 3472, casapia: 21581,
      estoril: 12216, estrela: 21610, famalicao: 12698, porto: 437, gilvicente: 3699, maritimo: 552, moreirense: 3696,
      rioave: 3822, santaclara: 12215, sporting: 2250, guimaraes: 5309,
    },
    mls: {
      atlanta: 18418, austin: 20906, montreal: 9720, charlotte: 21300, chicago: 182, colorado: 184, columbus: 183,
      dcunited: 193, cincinnati: 18267, dallas: 185, houston: 6077, intermiami: 20232, galaxy: 187, lafc: 18966,
      minnesota: 17362, nashville: 18986, newengland: 189, nycfc: 17606, orlando: 12011, philadelphia: 10739,
      portland: 9723, rsl: 4771, redbulls: 190, sandiego: 22529, sanjose: 191, seattle: 9726, sportingkc: 186,
      stlouis: 21812, toronto: 7318, vancouver: 9727,
    },
    'saudi-pro-league': {
      abha: 21833, ahli: 8346, diriyah: 131746, ettifaq: 8363, fateh: 13033, fayha: 21827, hazm: 21964, hilal: 929,
      ittihad: 2276, khaleej: 21829, kholood: 22028, nassr: 817, qadsiah: 22022, riyadh: 21965, shabab: 793,
      taawoun: 18459, faisaly: 21446, neom: 130899,
    },
    'champions-league': {
      aek: 887, roma: 104, arsenal: 359, astonvilla: 362, atletico: 1068, barcelona: 83, bayern: 132, bodoglimt: 2980,
      dortmund: 124, brugge: 570, como: 2572, porto: 437, fenerbahce: 436, feyenoord: 142, galatasaray: 432, inter: 110,
      lask: 4411, lens: 175, lille: 166, liverpool: 364, mancity: 382, manutd: 360, napoli: 114, psv: 148, psg: 160,
      leipzig: 11420, betis: 244, realmadrid: 86, sabah: 21922, shakhtar: 493, slavia: 494, slovan: 521, sporting: 2250,
      stuttgart: 134, viking: 510, villarreal: 102,
    },
  }).map(([league, ids]) => [league, Object.fromEntries(Object.entries(ids).map(([slug, id]) => [slug, ESPN_SOCCER(id)]))])),
}
// ESPN no tiene escudo de Al-Faisaly (404): fallback al escudo del artículo de Wikipedia.
SOURCES['saudi-pro-league'].faisaly = [ESPN_SOCCER(21446), 'https://upload.wikimedia.org/wikipedia/en/c/c9/Al-Faisaly_FC_New_Logo.png']

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
