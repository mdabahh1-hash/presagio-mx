import { cleanLabel } from './mapMarket'

// Escudos/logos reales por equipo, resueltos en el cliente a partir del
// outcome_key, el label o el id del mercado (sin campo en backend).
// Archivos en public/img/markets/teams/<liga>/<slug>.png (ver scripts/fetch-team-logos.mjs).
// Regla: si un nombre no mapea, se devuelve null (nunca un escudo equivocado).

export type TeamLeague = 'liga-mx' | 'nfl' | 'f1'
const BASE = '/img/markets/teams'

interface TeamDef { slug: string; names: string[] }

const FILLER = new Set(['fc', 'cf', 'club', 'de', 'del', 'uanl', 'unam'])

/** "Atlético de San Luis" → "atletico san luis"; "FC Juárez" → "juarez"; "Tigres UANL" → "tigres" */
export function normalizeTeamName(s: string): string {
  return cleanLabel(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/).filter(t => t && !FILLER.has(t)).join(' ')
}

export const LIGA_MX: TeamDef[] = [
  { slug: 'america',     names: ['América', 'Club América', 'Águilas'] },
  { slug: 'atlante',     names: ['Atlante'] },
  { slug: 'atlas',       names: ['Atlas'] },
  { slug: 'cruzazul',    names: ['Cruz Azul', 'cruzazul'] },
  { slug: 'guadalajara', names: ['Guadalajara', 'Chivas', 'Chivas Guadalajara'] },
  { slug: 'juarez',      names: ['Juárez', 'FC Juárez', 'Bravos', 'Bravos de Juárez'] },
  { slug: 'leon',        names: ['León', 'Club León'] },
  { slug: 'monterrey',   names: ['Monterrey', 'Rayados', 'CF Monterrey', 'Rayados de Monterrey'] },
  { slug: 'necaxa',      names: ['Necaxa'] },
  { slug: 'pachuca',     names: ['Pachuca'] },
  { slug: 'puebla',      names: ['Puebla'] },
  { slug: 'pumas',       names: ['Pumas', 'Pumas UNAM', 'UNAM'] },
  { slug: 'queretaro',   names: ['Querétaro', 'Gallos', 'Gallos Blancos'] },
  { slug: 'sanluis',     names: ['Atlético San Luis', 'Atlético de San Luis', 'San Luis', 'Atl. San Luis', 'sanluis'] },
  { slug: 'santos',      names: ['Santos', 'Santos Laguna'] },
  { slug: 'tigres',      names: ['Tigres', 'Tigres UANL'] },
  { slug: 'tijuana',     names: ['Tijuana', 'Xolos', 'Xolos de Tijuana'] },
  { slug: 'toluca',      names: ['Toluca'] },
]

export const NFL: TeamDef[] = [
  { slug: '49ers', names: ['49ers', 'San Francisco 49ers'] },
  { slug: 'bears', names: ['Bears', 'Chicago Bears'] },
  { slug: 'bengals', names: ['Bengals', 'Cincinnati Bengals'] },
  { slug: 'bills', names: ['Bills', 'Buffalo Bills'] },
  { slug: 'broncos', names: ['Broncos', 'Denver Broncos'] },
  { slug: 'browns', names: ['Browns', 'Cleveland Browns'] },
  { slug: 'buccaneers', names: ['Buccaneers', 'Bucs', 'Tampa Bay Buccaneers'] },
  { slug: 'cardinals', names: ['Cardinals', 'Arizona Cardinals'] },
  { slug: 'chargers', names: ['Chargers', 'Los Angeles Chargers'] },
  { slug: 'chiefs', names: ['Chiefs', 'Kansas City Chiefs'] },
  { slug: 'colts', names: ['Colts', 'Indianapolis Colts'] },
  { slug: 'commanders', names: ['Commanders', 'Washington Commanders'] },
  { slug: 'cowboys', names: ['Cowboys', 'Dallas Cowboys'] },
  { slug: 'dolphins', names: ['Dolphins', 'Miami Dolphins'] },
  { slug: 'eagles', names: ['Eagles', 'Philadelphia Eagles'] },
  { slug: 'falcons', names: ['Falcons', 'Atlanta Falcons'] },
  { slug: 'giants', names: ['Giants', 'New York Giants'] },
  { slug: 'jaguars', names: ['Jaguars', 'Jacksonville Jaguars'] },
  { slug: 'jets', names: ['Jets', 'New York Jets'] },
  { slug: 'lions', names: ['Lions', 'Detroit Lions'] },
  { slug: 'packers', names: ['Packers', 'Green Bay Packers'] },
  { slug: 'panthers', names: ['Panthers', 'Carolina Panthers'] },
  { slug: 'patriots', names: ['Patriots', 'New England Patriots'] },
  { slug: 'raiders', names: ['Raiders', 'Las Vegas Raiders'] },
  { slug: 'rams', names: ['Rams', 'Los Angeles Rams'] },
  { slug: 'ravens', names: ['Ravens', 'Baltimore Ravens'] },
  { slug: 'saints', names: ['Saints', 'New Orleans Saints'] },
  { slug: 'seahawks', names: ['Seahawks', 'Seattle Seahawks'] },
  { slug: 'steelers', names: ['Steelers', 'Pittsburgh Steelers'] },
  { slug: 'texans', names: ['Texans', 'Houston Texans'] },
  { slug: 'titans', names: ['Titans', 'Tennessee Titans'] },
  { slug: 'vikings', names: ['Vikings', 'Minnesota Vikings'] },
]

export const F1: TeamDef[] = [
  { slug: 'mercedes',    names: ['Mercedes', 'Mercedes-AMG', 'Mercedes AMG Petronas'] },
  { slug: 'ferrari',     names: ['Ferrari', 'Scuderia Ferrari'] },
  { slug: 'mclaren',     names: ['McLaren'] },
  { slug: 'redbull',     names: ['Red Bull', 'Red Bull Racing', 'Oracle Red Bull Racing', 'redbull'] },
  { slug: 'williams',    names: ['Williams'] },
  { slug: 'racingbulls', names: ['Racing Bulls', 'RB', 'Visa Cash App RB', 'VCARB', 'racingbulls'] },
  { slug: 'astonmartin', names: ['Aston Martin', 'astonmartin'] },
  { slug: 'alpine',      names: ['Alpine'] },
  { slug: 'audi',        names: ['Audi', 'Kick Sauber', 'Sauber', 'Stake'] },
  { slug: 'cadillac',    names: ['Cadillac'] },
  { slug: 'haas',        names: ['Haas'] },
]

const DEFS: Record<TeamLeague, TeamDef[]> = { 'liga-mx': LIGA_MX, nfl: NFL, f1: F1 }

const INDEX: Record<TeamLeague, Map<string, string>> = { 'liga-mx': new Map(), nfl: new Map(), f1: new Map() }
for (const league of Object.keys(DEFS) as TeamLeague[]) {
  for (const def of DEFS[league]) {
    INDEX[league].set(def.slug, def.slug)
    for (const n of def.names) INDEX[league].set(normalizeTeamName(n), def.slug)
  }
}

const pathOf = (league: TeamLeague, slug: string) => `${BASE}/${league}/${slug}.png`

export function leagueFor(sub?: string | null, marketId?: string | null): TeamLeague | null {
  if (sub === 'Liga MX') return 'liga-mx'
  if (sub === 'NFL') return 'nfl'
  if (sub === 'F1') return 'f1'
  if (marketId?.startsWith('mx-')) return 'liga-mx'
  if (marketId?.startsWith('nfl-')) return 'nfl'
  if (marketId?.startsWith('f1-')) return 'f1'
  return null
}

function lookup(name: string, league: TeamLeague | null): string | null {
  const key = normalizeTeamName(name)
  if (!key) return null
  const leagues: TeamLeague[] = league ? [league] : ['liga-mx', 'nfl', 'f1']
  for (const l of leagues) {
    const slug = INDEX[l].get(key)
    if (slug) return pathOf(l, slug)
  }
  return null
}

/** Escudo por nombre de equipo (label ya limpio o crudo). */
export function teamLogoFor(label: string, sub?: string | null, marketId?: string | null): string | null {
  return lookup(label, leagueFor(sub, marketId))
}

/** "Sergio Pérez (Cadillac)" → logo de Cadillac. */
export function driverTeamLogo(label: string): string | null {
  const m = /\(([^)]+)\)\s*$/.exec(cleanLabel(label))
  return m ? lookup(m[1], 'f1') : null
}

/** Logo para un outcome: outcome_key → label → escudería del piloto. 'empate' → null. */
export function outcomeLogo(o: { outcome_key: string; label: string }, sub?: string | null, marketId?: string | null): string | null {
  if (o.outcome_key === 'empate' || normalizeTeamName(o.label) === 'empate') return null
  const league = leagueFor(sub, marketId)
  return lookup(o.outcome_key, league) ?? lookup(o.label, league) ?? driverTeamLogo(o.label)
}

/** Par de escudos [local, visitante] para un mercado de partido, o null. */
export function matchLogos(m: {
  id?: string
  question?: string
  subcategory?: string | null
  outcomes?: { outcome_key: string; label: string }[]
}): [string, string] | null {
  const league = leagueFor(m.subcategory, m.id)
  const pair = (a: string, b: string): [string, string] | null => {
    const la = lookup(a, league), lb = lookup(b, league)
    return la && lb ? [la, lb] : null
  }
  // 1) prefijo del id: mx-{a}-{b}-…, nfl-{a}-{b}-…
  const idm = m.id ? /^(?:mx|nfl)-([a-z0-9]+)-([a-z0-9]+)-/.exec(m.id) : null
  if (idm) { const p = pair(idm[1], idm[2]); if (p) return p }
  // 2) pregunta "A vs B" / "A vs. B"
  if (m.question) {
    const q = cleanLabel(m.question).replace(/^¿?\s*qui[eé]n\s+gana\s+/iu, '')
    const qm = /^(.+?)\s+vs\.?\s+(.+?)(?:\s*[?—(–-]|$)/iu.exec(q)
    if (qm) { const p = pair(qm[1], qm[2]); if (p) return p }
  }
  // 3) outcomes local/visitante o los dos no-empate
  if (m.outcomes?.length) {
    const local = m.outcomes.find(o => o.outcome_key === 'local')
    const visit = m.outcomes.find(o => o.outcome_key === 'visitante')
    if (local && visit) { const p = pair(local.label, visit.label); if (p) return p }
    const teams = m.outcomes.filter(o => o.outcome_key !== 'empate')
    if (teams.length === 2) { const p = pair(teams[0].label, teams[1].label); if (p) return p }
  }
  return null
}
