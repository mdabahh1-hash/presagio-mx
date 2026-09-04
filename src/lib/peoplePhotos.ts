import { cleanLabel } from './mapMarket'

// Caras de personas (jugadores NFL, pilotos F1, futbolistas, boxeadores) resueltas
// en el cliente a partir del label del outcome o de la pregunta del mercado.
// Archivos en public/img/markets/people/<grupo>/<slug>.png, cuadrados 256×256
// (ver scripts/fetch-people-photos.mjs; créditos CC en people/CREDITS.md).
// Regla: si un nombre no mapea, null (nunca la cara de otra persona).

export type PersonGroup = 'nfl' | 'f1' | 'futbol' | 'boxeo'
const BASE = '/img/markets/people'

interface PersonDef { slug: string; names: string[] }

/** "🇲🇽 Sergio Pérez (Cadillac)" → "sergio perez"; "Ja'Marr Chase (WR, Bengals)" → "ja marr chase" */
export function normalizePersonName(s: string): string {
  return cleanLabel(s)
    .replace(/\s*\([^)]*\)\s*$/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/).filter(Boolean).join(' ')
}

export const NFL_PLAYERS: PersonDef[] = [
  { slug: 'hutchinson',   names: ['Aidan Hutchinson', 'Hutchinson'] },
  { slug: 'mesidor',      names: ['Akheem Mesidor', 'Mesidor'] },
  { slug: 'stbrown',      names: ['Amon-Ra St. Brown', 'St. Brown', 'stbrown'] },
  { slug: 'reese',        names: ['Arvell Reese'] },
  { slug: 'bijan',        names: ['Bijan Robinson', 'Bijan'] },
  { slug: 'breecehall',   names: ['Breece Hall', 'breecehall'] },
  { slug: 'burns',        names: ['Brian Burns'] },
  { slug: 'bthomas',      names: ['Brian Thomas Jr.', 'Brian Thomas', 'bthomas'] },
  { slug: 'downs',        names: ['Caleb Downs'] },
  { slug: 'tate',         names: ['Carnell Tate'] },
  { slug: 'lamb',         names: ['CeeDee Lamb', 'Lamb'] },
  { slug: 'mccaffrey',    names: ['Christian McCaffrey', 'McCaffrey'] },
  { slug: 'bailey',       names: ['David Bailey'] },
  { slug: 'achane',       names: ["De'Von Achane", 'Achane'] },
  { slug: 'henry',        names: ['Derrick Henry'] },
  { slug: 'london',       names: ['Drake London'] },
  { slug: 'maye',         names: ['Drake Maye', 'Maye'] },
  { slug: 'mendoza',      names: ['Fernando Mendoza'] },
  { slug: 'chase',        names: ["Ja'Marr Chase", 'Chase'] },
  { slug: 'jrodriguez',   names: ['Jacob Rodriguez'] },
  { slug: 'jprice',       names: ['Jadarian Price'] },
  { slug: 'gibbs',        names: ['Jahmyr Gibbs', 'Gibbs'] },
  { slug: 'hurts',        names: ['Jalen Hurts', 'Hurts'] },
  { slug: 'jcook',        names: ['James Cook', 'James Cook III', 'jcook'] },
  { slug: 'goff',         names: ['Jared Goff', 'Goff'] },
  { slug: 'jsn',          names: ['Jaxon Smith-Njigba', 'Smith-Njigba', 'JSN'] },
  { slug: 'daniels',      names: ['Jayden Daniels'] },
  { slug: 'waddle',       names: ['Jaylen Waddle', 'Waddle'] },
  { slug: 'love',         names: ['Jeremiyah Love'] },
  { slug: 'burrow',       names: ['Joe Burrow', 'Burrow'] },
  { slug: 'jtaylor',      names: ['Jonathan Taylor', 'jtaylor'] },
  { slug: 'allen',        names: ['Josh Allen'] },
  { slug: 'jacobs',       names: ['Josh Jacobs'] },
  { slug: 'herbert',      names: ['Justin Herbert', 'Herbert'] },
  { slug: 'jefferson',    names: ['Justin Jefferson', 'Jefferson'] },
  { slug: 'lamar',        names: ['Lamar Jackson', 'Lamar'] },
  { slug: 'lemon',        names: ['Makai Lemon'] },
  { slug: 'nabers',       names: ['Malik Nabers', 'Nabers'] },
  { slug: 'delane',       names: ['Mansoor Delane'] },
  { slug: 'stafford',     names: ['Matthew Stafford', 'Stafford'] },
  { slug: 'crosby',       names: ['Maxx Crosby', 'Crosby'] },
  { slug: 'garrett',      names: ['Myles Garrett'] },
  { slug: 'bosa',         names: ['Nick Bosa', 'Bosa'] },
  { slug: 'collins',      names: ['Nico Collins'] },
  { slug: 'bonitto',      names: ['Nik Bonitto', 'Bonitto'] },
  { slug: 'mahomes',      names: ['Patrick Mahomes', 'Mahomes'] },
  { slug: 'nacua',        names: ['Puka Nacua', 'Nacua'] },
  { slug: 'bain',         names: ['Rueben Bain Jr.', 'Rueben Bain'] },
  { slug: 'laporta',      names: ['Sam LaPorta', 'LaPorta'] },
  { slug: 'barkley',      names: ['Saquon Barkley', 'Barkley'] },
  { slug: 'styles',       names: ['Sonny Styles'] },
  { slug: 'watt',         names: ['T.J. Watt', 'TJ Watt'] },
  { slug: 'mclaurin',     names: ['Terry McLaurin', 'McLaurin'] },
  { slug: 'anderson',     names: ['Will Anderson Jr.', 'Will Anderson'] },
  { slug: 'stribling',    names: ["De'Zhaun Stribling", 'Stribling'] },
  { slug: 'concepcion',   names: ['KC Concepcion', 'Concepcion'] },
  { slug: 'beck',         names: ['Carson Beck'] },
]

export const F1_DRIVERS: PersonDef[] = [
  { slug: 'verstappen', names: ['Max Verstappen', 'Verstappen'] },
  { slug: 'norris',     names: ['Lando Norris', 'Norris'] },
  { slug: 'piastri',    names: ['Oscar Piastri', 'Piastri'] },
  { slug: 'leclerc',    names: ['Charles Leclerc', 'Leclerc'] },
  { slug: 'hamilton',   names: ['Lewis Hamilton', 'Hamilton'] },
  { slug: 'russell',    names: ['George Russell', 'Russell'] },
  { slug: 'antonelli',  names: ['Kimi Antonelli', 'Andrea Kimi Antonelli', 'Antonelli'] },
  { slug: 'sainz',      names: ['Carlos Sainz', 'Carlos Sainz Jr.', 'Sainz'] },
  { slug: 'albon',      names: ['Alexander Albon', 'Alex Albon', 'Albon'] },
  { slug: 'alonso',     names: ['Fernando Alonso', 'Alonso'] },
  { slug: 'stroll',     names: ['Lance Stroll', 'Stroll'] },
  { slug: 'gasly',      names: ['Pierre Gasly', 'Gasly'] },
  { slug: 'colapinto',  names: ['Franco Colapinto', 'Colapinto'] },
  { slug: 'hulkenberg', names: ['Nico Hülkenberg', 'Nico Hulkenberg', 'Hülkenberg'] },
  { slug: 'bortoleto',  names: ['Gabriel Bortoleto', 'Bortoleto'] },
  { slug: 'ocon',       names: ['Esteban Ocon', 'Ocon'] },
  { slug: 'bearman',    names: ['Oliver Bearman', 'Ollie Bearman', 'Bearman'] },
  { slug: 'hadjar',     names: ['Isack Hadjar', 'Hadjar'] },
  { slug: 'lawson',     names: ['Liam Lawson', 'Lawson'] },
  { slug: 'lindblad',   names: ['Arvid Lindblad', 'Lindblad'] },
  { slug: 'perez',      names: ['Sergio Pérez', 'Checo Pérez', 'Checo', 'Sergio "Checo" Pérez', 'Pérez'] },
  { slug: 'bottas',     names: ['Valtteri Bottas', 'Bottas'] },
]

export const FOOTBALLERS: PersonDef[] = [
  { slug: 'messi',         names: ['Lionel Messi', 'Leo Messi', 'Messi'] },
  { slug: 'mbappe',        names: ['Kylian Mbappé', 'Mbappé'] },
  { slug: 'kane',          names: ['Harry Kane', 'Kane'] },
  { slug: 'oyarzabal',     names: ['Mikel Oyarzabal', 'Oyarzabal'] },
  { slug: 'haaland',       names: ['Erling Haaland', 'Haaland'] },
  { slug: 'yamal',         names: ['Lamine Yamal', 'Yamal'] },
  { slug: 'vinicius',      names: ['Vinícius Júnior', 'Vinicius Junior', 'Vinícius Jr.', 'Vinícius', 'Vini'] },
  { slug: 'olise',         names: ['Michael Olise', 'Olise'] },
  { slug: 'bellingham',    names: ['Jude Bellingham', 'Bellingham'] },
  { slug: 'pedri',         names: ['Pedri'] },
  { slug: 'kvaratskhelia', names: ['Khvicha Kvaratskhelia', 'Kvaratskhelia', 'Kvara'] },
  { slug: 'julianalvarez', names: ['Julián Álvarez', 'julianalvarez'] },
  { slug: 'dembele',       names: ['Ousmane Dembélé', 'Dembélé'] },
  { slug: 'luisdiaz',      names: ['Luis Díaz', 'luisdiaz'] },
  { slug: 'osimhen',       names: ['Victor Osimhen', 'Osimhen'] },
  { slug: 'ferminlopez',   names: ['Fermín López', 'Fermín', 'ferminlopez'] },
  { slug: 'dimarco',       names: ['Federico Dimarco', 'Dimarco'] },
  { slug: 'fidalgo',       names: ['Álvaro Fidalgo', 'Fidalgo'] },
  { slug: 'cherki',        names: ['Rayan Cherki', 'Cherki'] },
  { slug: 'yoro',          names: ['Leny Yoro', 'Yoro'] },
  { slug: 'rodri',         names: ['Rodri'] },
  { slug: 'diomande',      names: ['Yan Diomande', 'Diomande'] },
  { slug: 'lenormand',     names: ['Robin Le Normand', 'Le Normand', 'lenormand'] },
  { slug: 'wirtz',         names: ['Florian Wirtz', 'Wirtz'] },
  { slug: 'fabianruiz',    names: ['Fabián Ruiz', 'fabianruiz'] },
  { slug: 'gnabry',        names: ['Serge Gnabry', 'Gnabry'] },
  { slug: 'bernardosilva', names: ['Bernardo Silva', 'bernardosilva'] },
  { slug: 'ardaguler',     names: ['Arda Güler', 'Güler', 'ardaguler'] },
  { slug: 'gakpo',         names: ['Cody Gakpo', 'Gakpo'] },
  { slug: 'kovacic',       names: ['Mateo Kovačić', 'Kovačić', 'Kovacic'] },
]

export const BOXERS: PersonDef[] = [
  { slug: 'canelo', names: ['Canelo Álvarez', 'Saúl Álvarez', 'Saúl "Canelo" Álvarez', 'Canelo'] },
  { slug: 'mbilli', names: ['Christian Mbilli', "Christian M'billi", 'Mbilli'] },
]

const DEFS: Record<PersonGroup, PersonDef[]> = { nfl: NFL_PLAYERS, f1: F1_DRIVERS, futbol: FOOTBALLERS, boxeo: BOXERS }
const GROUPS = Object.keys(DEFS) as PersonGroup[]

const pathOf = (group: PersonGroup, slug: string) => `${BASE}/${group}/${slug}.png`

// Alias normalizado → ruta. Un mismo alias en dos grupos gana el primero (no ocurre hoy).
const INDEX = new Map<string, string>()
// Para escanear preguntas: [alias normalizado, ruta], más largos primero.
const SCAN: [string, string][] = []
const scanned = new Set<string>()
for (const group of GROUPS) {
  for (const def of DEFS[group]) {
    const path = pathOf(group, def.slug)
    if (!INDEX.has(def.slug)) INDEX.set(def.slug, path)
    for (const n of def.names) {
      const key = normalizePersonName(n)
      if (!key) continue
      if (!INDEX.has(key)) INDEX.set(key, path)
      if (key.length >= 4 && INDEX.get(key) === path && !scanned.has(key)) { scanned.add(key); SCAN.push([key, path]) }
    }
  }
}
SCAN.sort((a, b) => b[0].length - a[0].length)

export const isPersonSrc = (src?: string | null) => !!src && src.startsWith(`${BASE}/`)

/** Cara por label de outcome ("🏃 Jeremiyah Love (RB, Cardinals)", "Max Verstappen (Red Bull)"). */
export function personPhotoFor(label: string): string | null {
  const key = normalizePersonName(label)
  return (key && INDEX.get(key)) || null
}

/**
 * Personas mencionadas en un texto (pregunta del mercado), en orden de aparición,
 * máximo `max`. Solo alias de palabra completa; los alias cortos (<4) no se escanean.
 */
export function peopleInText(text: string, max = 2): string[] {
  const t = ` ${normalizePersonName(text)} `
  const found: { at: number; src: string }[] = []
  for (const [alias, src] of SCAN) {
    if (found.some(f => f.src === src)) continue
    const at = t.indexOf(` ${alias} `)
    if (at >= 0) found.push({ at, src })
  }
  return found.sort((a, b) => a.at - b.at).slice(0, max).map(f => f.src)
}

/**
 * Caras para el thumbnail de un mercado deportivo sin partido: dos personas en la
 * pregunta → par ("Canelo vs Mbilli"); una → solo ("¿Checo termina en puntos?").
 */
export type FacesThumb = { kind: 'pair'; srcs: [string, string] } | { kind: 'solo'; src: string }
export function marketFaces(m: { question?: string; category?: string }): FacesThumb | null {
  if (m.category !== 'Deportes' || !m.question) return null
  const p = peopleInText(m.question)
  if (p.length === 2) return { kind: 'pair', srcs: [p[0], p[1]] }
  if (p.length === 1) return { kind: 'solo', src: p[0] }
  return null
}
