#!/usr/bin/env node
// Descarga fotos de mercados de Economía desde Wikimedia Commons a
// public/img/markets/economia/<slug>.jpg (96×96) y <slug>@2x.jpg (192×192), recorte cuadrado.
// Manual (no forma parte del build): `npm run photos:economia` / `node scripts/fetch-economia-photos.mjs [--force]`.
// Solo licencias libres verificadas en la página del archivo (dominio público, CC0, CC BY, CC BY-SA):
// la licencia y el autor se leen de la API de Commons y se escriben en economia/CREDITS.md.
// Los slugs deben coincidir con src/lib/marketImage.ts (SUBCATEGORY_IMAGE / MARKET_IMAGE).
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/img/markets/economia')
const FORCE = process.argv.includes('--force')
const UA = 'veredikt-photos/1.0 (https://veredikt.mx)'
const SIZE = 96
const FREE = /^(public domain|cc0|cc by(-sa)? \d(\.\d)?|no restrictions)/i

// slug → { title: archivo en Commons, position: foco del recorte (sharp) }
const SOURCES = {
  banxico:      { title: 'File:Fachada del Banco de México.jpg', position: 'centre' },
  pesos:        { title: 'File:Pesos mexicanos.jpg', position: 'centre' },
  contenedores: { title: 'File:TECI.JPG', position: 'centre' },
  fed:          { title: 'File:Eccles Building (26088200676).jpg', position: 'centre' },
  bmv:          { title: 'File:Bolsa Mexicana de Valores - panoramio.jpg', position: 'centre' },
  inegi:        { title: 'File:Fachada del edificio central del INEGI 02.jpg', position: 'centre' },
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

await writeFile(resolve(OUT, 'CREDITS.md'), `# Créditos de fotos de Economía

Generado por \`scripts/fetch-economia-photos.mjs\`. Fotos de Wikimedia Commons usadas bajo la licencia indicada
(recortadas a cuadrado de 96 y 192 px; en las CC BY-SA, los recortes se comparten bajo la misma licencia).

${credits.join('\n')}
`)
