#!/usr/bin/env node
// Descarga la foto de cada tema (subcategoría) desde Wikimedia Commons a
// public/img/markets/temas/<slug>.jpg (96×96) y <slug>@2x.jpg (192×192), recorte cuadrado.
// Manual (no forma parte del build): `npm run photos:temas` / `node scripts/fetch-tema-photos.mjs [--force]`.
// Solo licencias libres verificadas en la página del archivo (dominio público, CC0, CC BY, CC BY-SA):
// la licencia y el autor se leen de la API de Commons y se escriben en temas/CREDITS.md.
// Los slugs deben coincidir con src/lib/marketImage.ts (SUBCATEGORY_IMAGE / MARKET_IMAGE), y las
// subcategorías con foto, con SUBCATEGORIAS_CON_IMAGEN del backend (seeds/plantillas.py): el agente
// revisor avisa de las que se ven con el ícono genérico.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/img/markets/temas')
const FORCE = process.argv.includes('--force')
const UA = 'veredikt-photos/1.0 (https://veredikt.mx)'
const SIZE = 96
const FREE = /^(public domain|cc0|cc by(-sa)? \d(\.\d)?|no restrictions)/i

// slug → { title: archivo en Commons, position: foco del recorte (sharp) }
const SOURCES = {
  // Deportes
  cfp:          { title: 'File:2019 CFP - trophy on the sidelines (crop).jpg', position: 'centre' },
  // Economía
  banxico:      { title: 'File:Fachada del Banco de México.jpg', position: 'centre' },
  pesos:        { title: 'File:Pesos mexicanos.jpg', position: 'centre' },
  contenedores: { title: 'File:TECI.JPG', position: 'centre' },
  fed:          { title: 'File:Eccles Building (26088200676).jpg', position: 'centre' },
  bmv:          { title: 'File:Bolsa Mexicana de Valores - panoramio.jpg', position: 'centre' },
  inegi:        { title: 'File:Fachada del edificio central del INEGI 02.jpg', position: 'centre' },
  imss:         { title: 'File:Hospital 58 IMSS (León, Guanajuato).jpg', position: 'centre' },
  nyse:         { title: 'File:New York Stock Exchange August 2017 02.jpg', position: 'centre' },
  dolares:      { title: 'File:Obverse of the series 2009 $100 Federal Reserve Note.jpg', position: 'centre' },
  // Crypto
  bitcoin:      { title: 'File:Bitcoin logo Satoshi Nakamoto.svg', position: 'centre' },
  ethereum:     { title: 'File:Ethereum Logo.png', position: 'centre' },
  solana:       { title: 'File:Solana cryptocurrency two.jpg', position: 'centre' },
  usdt:         { title: 'File:USDT Logo.png', position: 'centre' },
  cripto:       { title: 'File:Bitcoin BTC golden coin with the symbol.jpg', position: 'centre' },
  sec:          { title: 'File:Facade of the U.S. Securities and Exchange Commission headquarters, Washington, D.C.jpg', position: 'centre' },
  // Política
  sheinbaum:    { title: 'File:Claudia Sheinbaum (cropped, centered).jpg', position: 'north' },
  visa:         { title: 'File:United States Passport Visa Pages.jpg', position: 'centre' },
  'san-lazaro': { title: 'File:Palacio Legislativo de San Lázaro obtenido con dron 01.jpg', position: 'centre' },
  apps:         { title: 'File:Social Media App Icons On The Screen of A Smartphone.jpg', position: 'centre' },
  // Global
  europa:       { title: 'File:Flag of Europe.svg', position: 'centre' },
  capitolio:    { title: 'File:United States Capitol - west front.jpg', position: 'centre' },
  trump:        { title: 'File:Official Presidential Portrait of President Donald J. Trump (2025).jpg', position: 'north' },
  jerusalen:    { title: 'File:Jerusalem-2013(2)-Temple Mount-Dome of the Rock (SE exposure).jpg', position: 'centre' },
  taipei:       { title: 'File:Taipei Taiwan Taipei-101-Tower-01.jpg', position: 'centre' },
  americas:     { title: 'File:Americas (orthographic projection).svg', position: 'centre' },
  ucrania:      { title: 'File:Ukraine (orthographic projection).svg', position: 'centre' },
  africa:       { title: 'File:Africa (orthographic projection)2.png', position: 'centre' },
  onu:          { title: 'File:United Nations Headquarters (5013024600).jpg', position: 'centre' },
  frontera:     { title: 'File:Border USA Mexico.jpg', position: 'centre' },
  // Tech
  ia:           { title: 'File:Artificial Neural Network with Chip.jpg', position: 'centre' },
  control:      { title: 'File:Nintendo-Switch-Pro-Controller-FL.jpg', position: 'centre' },
  // Entretenimiento
  celular:      { title: "File:ViVi's smartphone recording video at Yuanshan Park 20231125.jpg", position: 'centre' },
  'estudio-tv': { title: 'File:Television studio, Singapore Media Academy - 20150730.jpg', position: 'centre' },
  concierto:    { title: 'File:A large crowd enjoys a music concert illuminated by colorful lights and a stunning stage display.jpg', position: 'centre' },
  claqueta:     { title: 'File:Clapperboard, O2 film, September 2008.jpg', position: 'centre' },
  alfombra:     { title: 'File:Red carpet in Ashdod.jpg', position: 'centre' },
  // México y Clima
  angel:        { title: 'File:Angel of Independence (Angel de la Independencia).jpg', position: 'centre' },
  basilica:     { title: 'File:Basilica of Our Lady of Guadalupe - Wiki Loves Pyramids tour 009.jpg', position: 'centre' },
  estados:      { title: 'File:México División Política con nombres.png', position: 'centre' },
  batalla:      { title: 'File:Breakdance cypher.JPG', position: 'centre' },
  guardia:      { title: 'File:Guardia Nacional de México.jpg', position: 'centre' },
  huracan:      { title: 'File:Satellite image of Hurricane Michael. (44316110765).jpg', position: 'centre' },
  sequia:       { title: 'File:Presa Xolo seca. - panoramio.jpg', position: 'centre' },
}

const strip = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

async function info(title) {
  const q = new URLSearchParams({
    action: 'query', format: 'json', titles: title, prop: 'imageinfo',
    iiprop: 'url|extmetadata', iiurlwidth: '800', iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist',
  })
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, { headers: { 'User-Agent': UA } })
  const page = Object.values((await res.json()).query.pages)[0]
  const ii = page.imageinfo[0]
  const m = ii.extmetadata
  return {
    thumb: ii.thumburl, page: ii.descriptionurl,
    license: m.LicenseShortName?.value ?? '', licenseUrl: m.LicenseUrl?.value ?? '',
    artist: strip(m.Artist?.value ?? ''),
  }
}

const exists = p => access(p).then(() => true, () => false)

await mkdir(OUT, { recursive: true })
const credits = []
for (const [slug, { title, position }] of Object.entries(SOURCES)) {
  const meta = await info(title)
  if (!FREE.test(meta.license)) { console.error(`✗ ${slug}: licencia no admitida (${meta.license})`); process.exitCode = 1; continue }
  const out1 = resolve(OUT, `${slug}.jpg`)
  const out2 = resolve(OUT, `${slug}@2x.jpg`)
  if (FORCE || !(await exists(out1)) || !(await exists(out2))) {
    const res = await fetch(meta.thumb, { headers: { 'User-Agent': UA } })
    if (!res.ok) { console.error(`✗ ${slug}: HTTP ${res.status}`); process.exitCode = 1; continue }
    const buf = Buffer.from(await res.arrayBuffer())
    for (const [size, file] of [[SIZE, out1], [SIZE * 2, out2]]) {
      await writeFile(file, await sharp(buf).resize(size, size, { fit: 'cover', position }).jpeg({ quality: 82, mozjpeg: true }).toBuffer())
    }
    console.log(`✓ ${slug}`)
  }
  const license = meta.licenseUrl ? `[${meta.license}](${meta.licenseUrl})` : meta.license
  credits.push(`- \`${slug}.jpg\` / \`${slug}@2x.jpg\` — [${title.replace(/^File:/, '')}](${meta.page}) · ${meta.artist || 'autor no indicado'} · ${license}`)
}

await writeFile(resolve(OUT, 'CREDITS.md'), `# Créditos de fotos de temas

Generado por \`scripts/fetch-tema-photos.mjs\`. Fotos de Wikimedia Commons usadas bajo la licencia indicada
(recortadas a cuadrado de 96 y 192 px; en las CC BY-SA, los recortes se comparten bajo la misma licencia).

${credits.join('\n')}
`)
