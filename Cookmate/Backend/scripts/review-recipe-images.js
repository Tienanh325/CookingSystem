const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const catalog = require('./recipe-images');

const outputDir = path.join(__dirname, '../uploads/mon-an');
const tileWidth = 320;
const imageHeight = 180;
const labelHeight = 54;
const columns = 4;

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

async function buildTile(item) {
  const photo = await sharp(path.join(outputDir, item.filename))
    .resize(tileWidth, imageHeight, { fit: 'cover' })
    .toBuffer();
  const name = item.name.replace(/\s*·\s*\d+$/, '');
  const label = Buffer.from(`<svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111827"/>
    <text x="12" y="21" fill="#f9fafb" font-family="Arial, sans-serif" font-size="15" font-weight="700">${String(item.index).padStart(2, '0')}. ${escapeXml(name)}</text>
    <text x="12" y="42" fill="#9ca3af" font-family="Arial, sans-serif" font-size="12">${escapeXml(item.query)}</text>
  </svg>`);
  return sharp({ create: { width: tileWidth, height: imageHeight + labelHeight, channels: 3, background: '#111827' } })
    .composite([{ input: photo, top: 0, left: 0 }, { input: label, top: imageHeight, left: 0 }])
    .jpeg({ quality: 86 })
    .toBuffer();
}

async function run() {
  const tiles = await Promise.all(catalog.map(buildTile));
  const rows = Math.ceil(tiles.length / columns);
  const sheet = sharp({
    create: { width: columns * tileWidth, height: rows * (imageHeight + labelHeight), channels: 3, background: '#e5e7eb' },
  });
  await sheet.composite(tiles.map((input, index) => ({
    input,
    left: (index % columns) * tileWidth,
    top: Math.floor(index / columns) * (imageHeight + labelHeight),
  }))).jpeg({ quality: 88 }).toFile(path.join(outputDir, 'contact-sheet.jpg'));
  await fs.access(path.join(outputDir, 'contact-sheet.jpg'));
  console.log('Created uploads/mon-an/contact-sheet.jpg');
}

if (require.main === module) run().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = run;
