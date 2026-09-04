import { cleanLabel } from './mapMarket'
import { personPhotoFor } from './peoplePhotos'

// Escudos/logos reales por equipo, resueltos en el cliente a partir del
// outcome_key, el label o el id del mercado (sin campo en backend).
// Archivos en public/img/markets/teams/<liga>/<slug>.png (ver scripts/fetch-team-logos.mjs).
// Regla: si un nombre no mapea, se devuelve null (nunca un escudo equivocado).
// Las caras de personas (jugadores, pilotos, boxeadores) viven en ./peoplePhotos.ts
// y tienen prioridad sobre el escudo en outcomeLogo().

export type TeamLeague =
  | 'liga-mx' | 'nfl' | 'f1'
  | 'premier-league' | 'laliga' | 'serie-a' | 'bundesliga' | 'ligue-1'
  | 'liga-portugal' | 'mls' | 'champions-league' | 'saudi-pro-league'
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

// Aliases: nombre en seeds (con exónimos en español), shortDisplayName de ESPN
// y los fragmentos que usan los ids de mercado (pl-palace-city-…, laliga-malaga-depor-…).

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

export const PREMIER_LEAGUE: TeamDef[] = [
  { slug: 'arsenal',       names: ['Arsenal'] },
  { slug: 'astonvilla',    names: ['Aston Villa', 'Villa', 'astonvilla'] },
  { slug: 'bournemouth',   names: ['Bournemouth', 'AFC Bournemouth'] },
  { slug: 'brentford',     names: ['Brentford'] },
  { slug: 'brighton',      names: ['Brighton', 'Brighton & Hove Albion'] },
  { slug: 'chelsea',       names: ['Chelsea'] },
  { slug: 'coventry',      names: ['Coventry', 'Coventry City'] },
  { slug: 'crystalpalace', names: ['Crystal Palace', 'Palace', 'C Palace', 'crystalpalace'] },
  { slug: 'everton',       names: ['Everton'] },
  { slug: 'fulham',        names: ['Fulham'] },
  { slug: 'hull',          names: ['Hull', 'Hull City'] },
  { slug: 'ipswich',       names: ['Ipswich', 'Ipswich Town'] },
  { slug: 'leeds',         names: ['Leeds', 'Leeds United'] },
  { slug: 'liverpool',     names: ['Liverpool'] },
  { slug: 'mancity',       names: ['Manchester City', 'Man City', 'City', 'mancity'] },
  { slug: 'manutd',        names: ['Manchester United', 'Man United', 'Man Utd', 'United', 'manutd'] },
  { slug: 'newcastle',     names: ['Newcastle', 'Newcastle United'] },
  { slug: 'forest',        names: ['Nottingham Forest', 'Nottm Forest', 'Forest'] },
  { slug: 'sunderland',    names: ['Sunderland'] },
  { slug: 'tottenham',     names: ['Tottenham', 'Tottenham Hotspur', 'Spurs'] },
]

export const LALIGA: TeamDef[] = [
  { slug: 'alaves',       names: ['Alavés', 'Deportivo Alavés'] },
  { slug: 'athletic',     names: ['Athletic', 'Athletic Club', 'Athletic Bilbao'] },
  { slug: 'atletico',     names: ['Atlético', 'Atlético de Madrid', 'Atlético Madrid', 'Atleti'] },
  { slug: 'barcelona',    names: ['Barcelona', 'FC Barcelona', 'Barça'] },
  { slug: 'celta',        names: ['Celta', 'Celta de Vigo', 'Celta Vigo'] },
  { slug: 'deportivo',    names: ['Deportivo', 'Deportivo La Coruña', 'Deportivo de La Coruña', 'Depor'] },
  { slug: 'elche',        names: ['Elche'] },
  { slug: 'espanyol',     names: ['Espanyol'] },
  { slug: 'getafe',       names: ['Getafe'] },
  { slug: 'levante',      names: ['Levante'] },
  { slug: 'malaga',       names: ['Málaga'] },
  { slug: 'osasuna',      names: ['Osasuna'] },
  { slug: 'racing',       names: ['Racing', 'Racing Santander', 'Racing de Santander'] },
  { slug: 'rayo',         names: ['Rayo', 'Rayo Vallecano'] },
  { slug: 'betis',        names: ['Betis', 'Real Betis'] },
  { slug: 'realmadrid',   names: ['Real Madrid', 'realmadrid'] },
  { slug: 'realsociedad', names: ['Real Sociedad', 'realsociedad'] },
  { slug: 'sevilla',      names: ['Sevilla'] },
  { slug: 'valencia',     names: ['Valencia'] },
  { slug: 'villarreal',   names: ['Villarreal'] },
]

export const SERIE_A: TeamDef[] = [
  { slug: 'milan',      names: ['Milan', 'AC Milan'] },
  { slug: 'roma',       names: ['Roma', 'AS Roma'] },
  { slug: 'atalanta',   names: ['Atalanta'] },
  { slug: 'bologna',    names: ['Bologna'] },
  { slug: 'cagliari',   names: ['Cagliari'] },
  { slug: 'como',       names: ['Como'] },
  { slug: 'fiorentina', names: ['Fiorentina'] },
  { slug: 'frosinone',  names: ['Frosinone'] },
  { slug: 'genoa',      names: ['Genoa'] },
  { slug: 'inter',      names: ['Inter', 'Inter Milan', 'Internazionale', 'Inter de Milán'] },
  { slug: 'juventus',   names: ['Juventus', 'Juve'] },
  { slug: 'lazio',      names: ['Lazio'] },
  { slug: 'lecce',      names: ['Lecce'] },
  { slug: 'monza',      names: ['Monza'] },
  { slug: 'napoli',     names: ['Napoli', 'Nápoles'] },
  { slug: 'parma',      names: ['Parma'] },
  { slug: 'sassuolo',   names: ['Sassuolo'] },
  { slug: 'torino',     names: ['Torino'] },
  { slug: 'udinese',    names: ['Udinese'] },
  { slug: 'venezia',    names: ['Venezia'] },
]

export const BUNDESLIGA: TeamDef[] = [
  { slug: 'unionberlin', names: ['Union Berlin', '1. FC Union Berlin', 'Union', 'unionberlin'] },
  { slug: 'leverkusen',  names: ['Leverkusen', 'Bayer Leverkusen'] },
  { slug: 'bayern',      names: ['Bayern', 'Bayern Múnich', 'Bayern Munich', 'Bayern München', 'FC Bayern'] },
  { slug: 'dortmund',    names: ['Dortmund', 'Borussia Dortmund', 'BVB'] },
  { slug: 'gladbach',    names: ['Gladbach', 'Borussia Mönchengladbach', 'Mönchengladbach'] },
  { slug: 'frankfurt',   names: ['Frankfurt', 'Eintracht Frankfurt', 'Eintracht'] },
  { slug: 'augsburg',    names: ['Augsburg', 'Augsburgo', 'FC Augsburg'] },
  { slug: 'koln',        names: ['Köln', 'FC Köln', '1. FC Köln', 'Colonia', 'Cologne', 'FC Cologne'] },
  { slug: 'hamburg',     names: ['Hamburg', 'Hamburgo', 'Hamburg SV', 'Hamburger SV', 'HSV'] },
  { slug: 'mainz',       names: ['Mainz', 'Mainz 05'] },
  { slug: 'leipzig',     names: ['Leipzig', 'RB Leipzig'] },
  { slug: 'freiburg',    names: ['Freiburg', 'Friburgo', 'SC Freiburg'] },
  { slug: 'paderborn',   names: ['Paderborn', 'SC Paderborn', 'SC Paderborn 07'] },
  { slug: 'elversberg',  names: ['Elversberg', 'SV Elversberg'] },
  { slug: 'schalke',     names: ['Schalke', 'Schalke 04'] },
  { slug: 'hoffenheim',  names: ['Hoffenheim', 'TSG Hoffenheim'] },
  { slug: 'stuttgart',   names: ['Stuttgart', 'VfB Stuttgart'] },
  { slug: 'bremen',      names: ['Bremen', 'Werder Bremen', 'Werder'] },
]

export const LIGUE_1: TeamDef[] = [
  { slug: 'auxerre',    names: ['Auxerre', 'AJ Auxerre'] },
  { slug: 'monaco',     names: ['Monaco', 'Mónaco', 'AS Monaco'] },
  { slug: 'angers',     names: ['Angers'] },
  { slug: 'brest',      names: ['Brest'] },
  { slug: 'lehavre',    names: ['Le Havre', 'Le Havre AC', 'lehavre'] },
  { slug: 'lemans',     names: ['Le Mans', 'lemans'] },
  { slug: 'lens',       names: ['Lens', 'RC Lens'] },
  { slug: 'lille',      names: ['Lille', 'Lille OSC', 'LOSC'] },
  { slug: 'lorient',    names: ['Lorient'] },
  { slug: 'lyon',       names: ['Lyon', 'Olympique de Lyon', 'Olympique Lyonnais', 'OL'] },
  { slug: 'marseille',  names: ['Marseille', 'Marsella', 'Olympique de Marsella', 'Olympique de Marseille', 'OM'] },
  { slug: 'nice',       names: ['Nice', 'Niza', 'OGC Nice'] },
  { slug: 'parisfc',    names: ['Paris FC', 'parisfc'] },
  { slug: 'psg',        names: ['PSG', 'Paris Saint-Germain', 'París Saint-Germain', 'Paris SG'] },
  { slug: 'rennes',     names: ['Rennes', 'Stade Rennais'] },
  { slug: 'strasbourg', names: ['Strasbourg', 'Estrasburgo', 'RC Strasbourg'] },
  { slug: 'toulouse',   names: ['Toulouse'] },
  { slug: 'troyes',     names: ['Troyes'] },
]

export const LIGA_PORTUGAL: TeamDef[] = [
  { slug: 'viseu',      names: ['Académico de Viseu', 'Académico Viseu', 'Académico', 'Viseu'] },
  { slug: 'alverca',    names: ['Alverca'] },
  { slug: 'arouca',     names: ['Arouca'] },
  { slug: 'benfica',    names: ['Benfica', 'SL Benfica'] },
  { slug: 'braga',      names: ['Braga', 'SC Braga', 'Sporting de Braga'] },
  { slug: 'nacional',   names: ['Nacional', 'C.D. Nacional', 'CD Nacional'] },
  { slug: 'casapia',    names: ['Casa Pia', 'casapia'] },
  { slug: 'estoril',    names: ['Estoril', 'Estoril Praia'] },
  { slug: 'estrela',    names: ['Estrela', 'Estrela Amadora', 'Estrela da Amadora'] },
  { slug: 'famalicao',  names: ['Famalicão', 'FC Famalicao', 'FC Famalicão'] },
  { slug: 'porto',      names: ['Porto', 'FC Porto', 'Oporto'] },
  { slug: 'gilvicente', names: ['Gil Vicente', 'gilvicente'] },
  { slug: 'maritimo',   names: ['Marítimo', 'Maritimo'] },
  { slug: 'moreirense', names: ['Moreirense'] },
  { slug: 'rioave',     names: ['Rio Ave', 'rioave'] },
  { slug: 'santaclara', names: ['Santa Clara', 'santaclara'] },
  { slug: 'sporting',   names: ['Sporting', 'Sporting CP', 'Sporting Lisboa', 'Sporting de Lisboa'] },
  { slug: 'guimaraes',  names: ['Vitória Guimarães', 'Vitória de Guimarães', 'Vitória de Guimaraes', 'Guimarães', 'Vitória', 'vitoria'] },
]

export const MLS: TeamDef[] = [
  { slug: 'atlanta',      names: ['Atlanta', 'Atlanta United', 'Atlanta United FC'] },
  { slug: 'austin',       names: ['Austin', 'Austin FC'] },
  { slug: 'montreal',     names: ['Montréal', 'CF Montréal', 'Montreal'] },
  { slug: 'charlotte',    names: ['Charlotte', 'Charlotte FC'] },
  { slug: 'chicago',      names: ['Chicago', 'Chicago Fire', 'Chicago Fire FC'] },
  { slug: 'colorado',     names: ['Colorado', 'Colorado Rapids'] },
  { slug: 'columbus',     names: ['Columbus', 'Columbus Crew'] },
  { slug: 'dcunited',     names: ['D.C. United', 'DC United', 'dcunited'] },
  { slug: 'cincinnati',   names: ['Cincinnati', 'FC Cincinnati'] },
  { slug: 'dallas',       names: ['Dallas', 'FC Dallas'] },
  { slug: 'houston',      names: ['Houston', 'Houston Dynamo', 'Houston Dynamo FC'] },
  { slug: 'intermiami',   names: ['Inter Miami', 'Inter Miami CF', 'Miami', 'intermiami'] },
  { slug: 'galaxy',       names: ['LA Galaxy', 'Galaxy', 'Los Angeles Galaxy'] },
  { slug: 'lafc',         names: ['LAFC', 'Los Angeles FC'] },
  { slug: 'minnesota',    names: ['Minnesota', 'Minnesota United', 'Minnesota United FC'] },
  { slug: 'nashville',    names: ['Nashville', 'Nashville SC'] },
  { slug: 'newengland',   names: ['New England', 'New England Revolution', 'newengland'] },
  { slug: 'nycfc',        names: ['NYCFC', 'New York City FC', 'New York City'] },
  { slug: 'orlando',      names: ['Orlando', 'Orlando City', 'Orlando City SC'] },
  { slug: 'philadelphia', names: ['Philadelphia', 'Philadelphia Union'] },
  { slug: 'portland',     names: ['Portland', 'Portland Timbers'] },
  { slug: 'rsl',          names: ['Real Salt Lake', 'Salt Lake', 'RSL', 'saltlake'] },
  { slug: 'redbulls',     names: ['New York Red Bulls', 'NY Red Bulls', 'Red Bull New York', 'Red Bull NY', 'Red Bulls', 'nyredbulls'] },
  { slug: 'sandiego',     names: ['San Diego', 'San Diego FC', 'sandiego'] },
  { slug: 'sanjose',      names: ['San Jose', 'San Jose Earthquakes', 'sanjose'] },
  { slug: 'seattle',      names: ['Seattle', 'Seattle Sounders', 'Seattle Sounders FC'] },
  { slug: 'sportingkc',   names: ['Sporting Kansas City', 'Sporting KC', 'Kansas City', 'SKC', 'sportingkc'] },
  { slug: 'stlouis',      names: ['St. Louis', 'St. Louis City', 'St. Louis CITY', 'St. Louis CITY SC', 'St. Louis City SC', 'stlouis'] },
  { slug: 'toronto',      names: ['Toronto', 'Toronto FC'] },
  { slug: 'vancouver',    names: ['Vancouver', 'Vancouver Whitecaps'] },
]

export const SAUDI_PRO_LEAGUE: TeamDef[] = [
  { slug: 'abha',     names: ['Abha'] },
  { slug: 'ahli',     names: ['Al-Ahli', 'Al Ahli', 'Ahli'] },
  { slug: 'diriyah',  names: ['Al Diriyah', 'Al-Diriyah', 'Diriyah'] },
  { slug: 'ettifaq',  names: ['Al-Ettifaq', 'Al Ettifaq', 'Ettifaq'] },
  { slug: 'fateh',    names: ['Al-Fateh', 'Al Fateh', 'Fateh'] },
  { slug: 'fayha',    names: ['Al-Fayha', 'Al Fayha', 'Fayha'] },
  { slug: 'hazm',     names: ['Al-Hazm', 'Al Hazm', 'Al Hazem', 'Hazm'] },
  { slug: 'hilal',    names: ['Al-Hilal', 'Al Hilal', 'Hilal'] },
  { slug: 'ittihad',  names: ['Al-Ittihad', 'Al Ittihad', 'Ittihad'] },
  { slug: 'khaleej',  names: ['Al-Khaleej', 'Al Khaleej', 'Khaleej'] },
  { slug: 'kholood',  names: ['Al-Kholood', 'Al Kholood', 'Kholood'] },
  { slug: 'nassr',    names: ['Al-Nassr', 'Al Nassr', 'Nassr'] },
  { slug: 'qadsiah',  names: ['Al-Qadsiah', 'Al Qadsiah', 'Qadsiah'] },
  { slug: 'riyadh',   names: ['Al-Riyadh', 'Al Riyadh', 'Riyadh'] },
  { slug: 'shabab',   names: ['Al-Shabab', 'Al Shabab', 'Shabab'] },
  { slug: 'taawoun',  names: ['Al-Taawoun', 'Al Taawoun', 'Taawoun'] },
  { slug: 'faisaly',  names: ['Al-Faisaly', 'Al Faisaly', 'Faisaly'] },
  { slug: 'neom',     names: ['NEOM', 'NEOM SC', 'Neom SC'] },
]

export const CHAMPIONS_LEAGUE: TeamDef[] = [
  { slug: 'aek',         names: ['AEK', 'AEK Athens', 'AEK Atenas'] },
  { slug: 'roma',        names: ['Roma', 'AS Roma'] },
  { slug: 'arsenal',     names: ['Arsenal'] },
  { slug: 'astonvilla',  names: ['Aston Villa', 'Villa', 'astonvilla'] },
  { slug: 'atletico',    names: ['Atlético', 'Atlético de Madrid', 'Atlético Madrid'] },
  { slug: 'barcelona',   names: ['Barcelona', 'FC Barcelona'] },
  { slug: 'bayern',      names: ['Bayern', 'Bayern Múnich', 'Bayern Munich', 'Bayern München'] },
  { slug: 'bodoglimt',   names: ['Bodø/Glimt', 'Bodo/Glimt', 'Bodø Glimt', 'Bodo', 'bodoglimt'] },
  { slug: 'dortmund',    names: ['Dortmund', 'Borussia Dortmund'] },
  { slug: 'brugge',      names: ['Club Brugge', 'Brugge', 'Brujas', 'Club Brujas'] },
  { slug: 'como',        names: ['Como'] },
  { slug: 'porto',       names: ['Porto', 'FC Porto', 'Oporto'] },
  { slug: 'fenerbahce',  names: ['Fenerbahçe', 'Fenerbahce'] },
  { slug: 'feyenoord',   names: ['Feyenoord', 'Feyenoord Rotterdam'] },
  { slug: 'galatasaray', names: ['Galatasaray'] },
  { slug: 'inter',       names: ['Inter', 'Inter Milan', 'Internazionale', 'Inter de Milán'] },
  { slug: 'lask',        names: ['LASK', 'LASK Linz'] },
  { slug: 'lens',        names: ['Lens', 'RC Lens'] },
  { slug: 'lille',       names: ['Lille', 'Lille OSC'] },
  { slug: 'liverpool',   names: ['Liverpool'] },
  { slug: 'mancity',     names: ['Manchester City', 'Man City', 'City', 'mancity'] },
  { slug: 'manutd',      names: ['Manchester United', 'Man United', 'Man Utd', 'United', 'manutd'] },
  { slug: 'napoli',      names: ['Napoli', 'Nápoles'] },
  { slug: 'psv',         names: ['PSV', 'PSV Eindhoven'] },
  { slug: 'psg',         names: ['PSG', 'Paris Saint-Germain', 'París Saint-Germain'] },
  { slug: 'leipzig',     names: ['Leipzig', 'RB Leipzig'] },
  { slug: 'betis',       names: ['Betis', 'Real Betis'] },
  { slug: 'realmadrid',  names: ['Real Madrid', 'realmadrid'] },
  { slug: 'sabah',       names: ['Sabah', 'Sabah FK'] },
  { slug: 'shakhtar',    names: ['Shakhtar', 'Shakhtar Donetsk'] },
  { slug: 'slavia',      names: ['Slavia', 'Slavia Praha', 'Slavia Prague', 'Slavia Praga'] },
  { slug: 'slovan',      names: ['Slovan', 'Slovan Bratislava', 'S Bratislava'] },
  { slug: 'sporting',    names: ['Sporting', 'Sporting CP', 'Sporting Lisboa'] },
  { slug: 'stuttgart',   names: ['Stuttgart', 'VfB Stuttgart'] },
  { slug: 'viking',      names: ['Viking', 'Viking FK'] },
  { slug: 'villarreal',  names: ['Villarreal'] },
]

const DEFS: Record<TeamLeague, TeamDef[]> = {
  'liga-mx': LIGA_MX, nfl: NFL, f1: F1,
  'premier-league': PREMIER_LEAGUE, laliga: LALIGA, 'serie-a': SERIE_A, bundesliga: BUNDESLIGA,
  'ligue-1': LIGUE_1, 'liga-portugal': LIGA_PORTUGAL, mls: MLS, 'champions-league': CHAMPIONS_LEAGUE,
  'saudi-pro-league': SAUDI_PRO_LEAGUE,
}
const LEAGUES = Object.keys(DEFS) as TeamLeague[]

const INDEX = Object.fromEntries(LEAGUES.map(l => [l, new Map<string, string>()])) as Record<TeamLeague, Map<string, string>>
for (const league of LEAGUES) {
  for (const def of DEFS[league]) {
    INDEX[league].set(def.slug, def.slug)
    for (const n of def.names) INDEX[league].set(normalizeTeamName(n), def.slug)
  }
}

const pathOf = (league: TeamLeague, slug: string) => `${BASE}/${league}/${slug}.png`

// Subcategoría exacta (markets.subcategory) → liga. 'Leagues Cup' no está a
// propósito: mezcla Liga MX y MLS, así que se busca en todas las ligas.
const SUB_TO_LEAGUE: Record<string, TeamLeague> = {
  'Liga MX': 'liga-mx', NFL: 'nfl', F1: 'f1',
  'Premier League': 'premier-league', LaLiga: 'laliga', 'Serie A': 'serie-a', Bundesliga: 'bundesliga',
  'Ligue 1': 'ligue-1', 'Liga Portugal': 'liga-portugal', MLS: 'mls', 'Champions League': 'champions-league',
  'Saudi Pro League': 'saudi-pro-league',
}
// Prefijo del id de mercado (mx-…, pl-…, laliga-…) → liga.
const ID_PREFIX_TO_LEAGUE: Record<string, TeamLeague> = {
  mx: 'liga-mx', nfl: 'nfl', f1: 'f1', pl: 'premier-league', laliga: 'laliga', sa: 'serie-a', bl: 'bundesliga',
  l1: 'ligue-1', lp: 'liga-portugal', mls: 'mls', ucl: 'champions-league', spl: 'saudi-pro-league',
}

export function leagueFor(sub?: string | null, marketId?: string | null): TeamLeague | null {
  if (sub && SUB_TO_LEAGUE[sub]) return SUB_TO_LEAGUE[sub]
  const prefix = marketId?.split('-')[0]
  return (prefix && ID_PREFIX_TO_LEAGUE[prefix]) || null
}

function lookup(name: string, league: TeamLeague | null): string | null {
  const key = normalizeTeamName(name)
  if (!key) return null
  const leagues = league ? [league] : LEAGUES
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

/**
 * Equipo entre paréntesis al final del label: "Sergio Pérez (Cadillac)" → Cadillac,
 * "Jeremiyah Love (RB, Cardinals)" → Cardinals (último elemento de la lista).
 */
export function teamFromParens(label: string, league: TeamLeague | null = null): string | null {
  const m = /\(([^)]+)\)\s*$/.exec(cleanLabel(label))
  if (!m) return null
  const team = m[1].split(',').pop()!.trim()
  return lookup(team, league) ?? (league ? null : lookup(team, 'nfl') ?? lookup(team, 'f1'))
}

/** @deprecated usa teamFromParens */
export const driverTeamLogo = (label: string) => teamFromParens(label, 'f1')

/**
 * Imagen para un outcome: cara de la persona → outcome_key → label → equipo entre
 * paréntesis. 'empate' → null.
 */
export function outcomeLogo(o: { outcome_key: string; label: string }, sub?: string | null, marketId?: string | null): string | null {
  if (o.outcome_key === 'empate' || normalizeTeamName(o.label) === 'empate') return null
  const league = leagueFor(sub, marketId)
  return personPhotoFor(o.label) ?? lookup(o.outcome_key, league) ?? lookup(o.label, league) ?? teamFromParens(o.label, league)
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
  // 1) id: <liga>-{a}-{b}-… (mx-cruzazul-santos-j7-ap26, pl-palace-city-j2-2627)
  const idm = m.id ? /^([a-z0-9]+)-([a-z0-9]+)-([a-z0-9]+)-/.exec(m.id) : null
  if (idm && ID_PREFIX_TO_LEAGUE[idm[1]]) { const p = pair(idm[2], idm[3]); if (p) return p }
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
