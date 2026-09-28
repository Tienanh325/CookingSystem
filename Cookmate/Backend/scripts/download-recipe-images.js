require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const catalog = require('./recipe-images');
const db = require('../src/models');
const sequelize = require('../src/config/database');

const outputDir = path.join(__dirname, '../uploads/mon-an');
const manifestPath = path.join(outputDir, 'sources.json');
const partialManifestPath = path.join(outputDir, 'sources.partial.json');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CookmateStudentProject/1.0';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}) {
  let lastResponse;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      lastResponse = await fetch(url, { ...options, headers: { 'User-Agent': userAgent, ...(options.headers || {}) } });
    } catch (error) {
      if (attempt === 5) throw error;
      await wait(attempt * 1500);
      continue;
    }
    if (lastResponse.ok) return lastResponse;
    if (![429, 500, 502, 503, 504].includes(lastResponse.status) || attempt === 5) return lastResponse;
    const retryAfter = Number(lastResponse.headers.get('retry-after'));
    await wait(Number.isFinite(retryAfter) ? retryAfter * 1000 : attempt * 2500);
  }
  return lastResponse;
}

async function duckDuckGoImages(query) {
  const searchResponse = await fetchWithRetry(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`);
  if (!searchResponse.ok) throw new Error(`Image search failed (${searchResponse.status}) for ${query}`);
  const html = await searchResponse.text();
  const token = html.match(/vqd=[\x27\x22]?([\d-]+)/)?.[1];
  if (!token) throw new Error(`DuckDuckGo token was not found for ${query}`);
  const params = new URLSearchParams({ l: 'vn-vi', o: 'json', q: query, vqd: token, f: ',,,', p: '1' });
  const imageResponse = await fetchWithRetry(`https://duckduckgo.com/i.js?${params}`, {
    headers: { Referer: 'https://duckduckgo.com/' },
  });
  if (!imageResponse.ok) throw new Error(`Image results failed (${imageResponse.status}) for ${query}`);
  return (await imageResponse.json()).results || [];
}

function validCandidate(candidate) {
  if (!candidate?.image || !candidate?.url) return false;
  if ((candidate.width || 0) < 600 || (candidate.height || 0) < 400) return false;
  if (/\.(gif|svg)(?:\?|$)/i.test(candidate.image)) return false;
  if (/facebook|lookaside\.fbsbx|pinterest|tiktok/i.test(candidate.image)) return false;
  const ratio = candidate.width / candidate.height;
  return ratio >= 0.75 && ratio <= 2.25;
}

async function findImage(item) {
  if (item.directImage) {
    return [{
      image: item.directImage,
      url: item.directSource || item.directImage,
      title: `Ảnh ${item.name.replace(/\s*·\s*\d+$/, '')}`,
    }];
  }
  const stockQuery = `${item.query} food site:pexels.com`;
  let results = process.env.RECIPE_IMAGE_GENERAL === '1' || item.generalSearch
    ? []
    : (await duckDuckGoImages(stockQuery)).filter(validCandidate);
  if (!results.length) {
    const vietnameseName = item.name.replace(/\s*·\s*\d+$/, '');
    results = (await duckDuckGoImages(`\x22${vietnameseName}\x22 món ăn`)).filter(validCandidate);
  }
  if (!results.length) throw new Error(`No usable image found for ${item.name}`);
  return results;
}

async function normalizeImage(source, destination) {
  const response = await fetchWithRetry(source, { headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' } });
  if (!response.ok) throw new Error(`Image download failed (${response.status}): ${source}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`Downloaded resource is not an image: ${source}`);
  const input = Buffer.from(await response.arrayBuffer());
  await sharp(input)
    .rotate()
    .resize(1200, 750, { fit: 'cover', position: 'attention' })
    .webp({ quality: 84 })
    .toFile(destination);
}

async function loadManifest() {
  for (const candidate of [partialManifestPath, manifestPath]) {
    try { return JSON.parse(await fs.readFile(candidate, 'utf8')); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return [];
}

async function savePartial(items) {
  const sorted = [...items].sort((a, b) => a.idMonAn - b.idMonAn);
  await fs.writeFile(partialManifestPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

async function download(item) {
  const destination = path.join(outputDir, item.filename);
  if (item.existingFilename) {
    await sharp(path.join(outputDir, item.existingFilename))
      .rotate()
      .resize(1200, 750, { fit: 'cover', position: 'attention' })
      .webp({ quality: 84 })
      .toFile(destination);
    return {
      idMonAn: item.index,
      tenMonAn: item.name,
      file: item.publicPath,
      sourcePage: null,
      originalUrl: null,
      author: 'Tài nguyên món ăn có sẵn trong dự án',
      license: 'Chưa xác định nguồn gốc cũ',
      searchQuery: null,
    };
  }
  const candidates = await findImage(item);
  let candidate;
  let lastError;
  for (const result of candidates.slice(item.candidateOffset || 0, (item.candidateOffset || 0) + 10)) {
    try {
      await normalizeImage(result.image, destination);
      candidate = result;
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!candidate) throw lastError || new Error(`No downloadable image found for ${item.name}`);
  const isPexels = /(^|\.)pexels\.com$/i.test(new URL(candidate.url).hostname);
  return {
    idMonAn: item.index,
    tenMonAn: item.name,
    file: item.publicPath,
    sourcePage: candidate.url,
    originalUrl: candidate.image,
    author: candidate.title || new URL(candidate.url).hostname,
    license: isPexels ? 'Pexels License' : 'Vui lòng kiểm tra điều khoản tại trang nguồn',
    searchQuery: isPexels ? `${item.query} food site:pexels.com` : item.name.replace(/\s*·\s*\d+$/, ''),
  };
}

async function updateDatabase() {
  await sequelize.transaction(async (transaction) => {
    for (const item of catalog) {
      const recipe = await db.MonAn.findOne({ where: { tenMonAn: item.name }, transaction });
      if (!recipe) throw new Error(`Recipe not found: ${item.name}`);
      const oldPath = recipe.anhDaiDien;
      await recipe.update({ anhDaiDien: item.publicPath }, { transaction });
      const cover = await db.HinhAnhMonAn.findOne({ where: { idMonAn: recipe.idMonAn, anhDaiDien: 1 }, transaction });
      const values = { duongDan: item.publicPath, moTa: `Ảnh đúng món ${item.name}`, thuTu: 1, anhDaiDien: 1 };
      if (cover) await cover.update(values, { transaction });
      else await db.HinhAnhMonAn.create({ idMonAn: recipe.idMonAn, ...values }, { transaction });
      if (oldPath && oldPath !== item.publicPath) {
        await db.HinhAnhMonAn.update({ duongDan: item.publicPath }, {
          where: { idMonAn: recipe.idMonAn, duongDan: oldPath }, transaction,
        });
      }
    }
  });
}

async function run() {
  await fs.mkdir(outputDir, { recursive: true });
  const manifest = await loadManifest();
  const completed = new Map(manifest.map((item) => [item.idMonAn, item]));
  const start = Math.max(1, Number(process.env.RECIPE_IMAGE_START || 1));
  const limit = Math.max(1, Number(process.env.RECIPE_IMAGE_LIMIT || catalog.length));
  const requestedIds = new Set(String(process.env.RECIPE_IMAGE_IDS || '')
    .split(',').map(Number).filter((value) => Number.isInteger(value) && value > 0));
  const selected = requestedIds.size
    ? catalog.filter((item) => requestedIds.has(item.index))
    : catalog.filter((item) => item.index >= start).slice(0, limit);

  for (const item of selected) {
    const exists = await fs.access(path.join(outputDir, item.filename)).then(() => true).catch(() => false);
    if (process.env.RECIPE_IMAGE_FORCE !== '1' && completed.has(item.index) && exists) {
      console.log(`Skipped ${item.index}/${catalog.length}: ${item.name}`);
      continue;
    }
    const source = await download(item);
    completed.set(item.index, source);
    await savePartial([...completed.values()]);
    console.log(`Downloaded ${item.index}/${catalog.length}: ${item.name}`);
    await wait(1100);
  }

  if (completed.size === catalog.length) {
    const sorted = [...completed.values()].sort((a, b) => a.idMonAn - b.idMonAn);
    await fs.writeFile(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
    await fs.rm(partialManifestPath, { force: true });
    await updateDatabase();
    console.log(`Updated ${sorted.length} recipes. Attribution: uploads/mon-an/sources.json`);
  } else {
    console.log(`Saved ${completed.size}/${catalog.length} images. Run again to continue.`);
  }
}

if (require.main === module) run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
module.exports = run;
