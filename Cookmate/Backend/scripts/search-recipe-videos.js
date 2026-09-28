const fs = require('node:fs/promises');
const path = require('node:path');
const catalog = require('./recipe-images');

const outputPath = path.join(__dirname, 'recipe-videos.json');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CookmateStudentProject/1.0';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ignoredWords = new Set(['cach', 'lam', 'mon', 'ngon', 'don', 'gian', 'tai', 'nha', 'va', 'voi', 'cookmate']);
const videoOverrides = {
  10: { searchQuery: 'sữa chua chuối yến mạch ăn sáng -bánh', videoId: 'o2W6mgfFp30' },
  18: { searchQuery: 'salad đậu đỏ cách làm', videoId: 'FerY4mCVJfo' },
  20: { searchQuery: 'yến mạch chuối ăn sáng -bánh', videoId: 'TlgDVpSfick' },
  21: { searchQuery: 'khoai lang nướng nguyên củ', videoId: 'jVQjM0ofTs4' },
  24: { searchQuery: 'cà rốt mật ong món ăn', videoId: 'dG2akU7iZOE' },
  25: { searchQuery: 'cách làm salad cà chua hành tây', videoId: 'rBJPBuzk-v0' },
  42: { searchQuery: 'bánh mì bơ trứng avocado', videoId: 'ndE8EGLFm1c' },
  48: { searchQuery: 'cheesy vegetable noodles recipe', videoId: 'OtCV5SQRhEo' },
  51: { searchQuery: 'almond oatmeal bowl recipe', videoId: '-MyLrG-4sMk' },
  55: { searchQuery: 'honey yogurt bowl recipe', videoId: '6zxRs03a-5Q' },
  57: { searchQuery: 'whole wheat noodles beef recipe', videoId: 'e-uPTCVabws' },
};

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

async function fetchWithRetry(url) {
  let error;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': userAgent, 'Accept-Language': 'vi-VN,vi;q=0.9' } });
      if (response.ok) return response;
      error = new Error(`YouTube search failed with HTTP ${response.status}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (fetchError) {
      error = fetchError;
    }
    await wait(attempt * 2500);
  }
  throw error;
}

function collectVideoRenderers(value, output = []) {
  if (!value || typeof value !== 'object') return output;
  if (value.videoRenderer) output.push(value.videoRenderer);
  for (const child of Object.values(value)) collectVideoRenderers(child, output);
  return output;
}

function parseDuration(value = '') {
  const parts = value.split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return 0;
  return parts.reduce((seconds, part) => seconds * 60 + part, 0);
}

function candidateScore(candidate, dishName, position) {
  const title = normalize(candidate.title);
  const tokens = normalize(dishName).split(' ').filter((token) => token.length > 1 && !ignoredWords.has(token));
  const matched = tokens.filter((token) => title.includes(token)).length;
  const coverage = tokens.length ? matched / tokens.length : 0;
  const duration = parseDuration(candidate.duration);
  const usefulDuration = duration >= 60 && duration <= 2400 ? 3 : duration > 0 ? 1 : 0;
  const tutorial = /cach lam|huong dan|vao bep|cong thuc|nau/i.test(normalize(candidate.title)) ? 2 : 0;
  return coverage * 20 + matched * 3 + usefulDuration + tutorial - position * 0.08;
}

async function search(item) {
  const dishName = item.name.replace(/\s*·\s*\d+$/, '');
  const override = videoOverrides[item.index];
  const searchQuery = override?.searchQuery || `cách làm ${dishName}`;
  if (override) {
    const url = `https://www.youtube.com/watch?v=${override.videoId}`;
    const metadataResponse = await fetchWithRetry(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    const metadata = await metadataResponse.json();
    return {
      idMonAn: item.index,
      tenMonAn: item.name,
      videoId: override.videoId,
      title: metadata.title,
      channel: metadata.author_name,
      duration: '',
      url,
      embedUrl: `https://www.youtube-nocookie.com/embed/${override.videoId}?playsinline=1&rel=0`,
      searchQuery,
    };
  }
  const response = await fetchWithRetry(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`);
  const html = await response.text();
  const match = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!match) throw new Error(`YouTube result data was not found for ${dishName}`);
  const seen = new Set();
  const candidates = collectVideoRenderers(JSON.parse(match[1]))
    .map((video, position) => ({
      videoId: video.videoId,
      title: video.title?.runs?.map((part) => part.text).join('') || '',
      channel: video.ownerText?.runs?.[0]?.text || '',
      duration: video.lengthText?.simpleText || '',
      position,
    }))
    .filter((video) => video.videoId && video.title && !seen.has(video.videoId) && seen.add(video.videoId))
    .filter((video) => parseDuration(video.duration) >= 60)
    .sort((a, b) => candidateScore(b, dishName, b.position) - candidateScore(a, dishName, a.position));
  if (!candidates.length) throw new Error(`No cooking video was found for ${dishName}`);
  const selected = candidates[0];
  return {
    idMonAn: item.index,
    tenMonAn: item.name,
    videoId: selected.videoId,
    title: selected.title,
    channel: selected.channel,
    duration: selected.duration,
    url: `https://www.youtube.com/watch?v=${selected.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${selected.videoId}?playsinline=1&rel=0`,
    searchQuery,
  };
}

async function run() {
  let results = [];
  try { results = JSON.parse(await fs.readFile(outputPath, 'utf8')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const completed = new Map(results.map((item) => [item.idMonAn, item]));
  const requestedIds = new Set(String(process.env.RECIPE_VIDEO_IDS || '')
    .split(',').map(Number).filter((value) => Number.isInteger(value) && value > 0));
  const force = process.env.RECIPE_VIDEO_FORCE === '1';
  const selected = requestedIds.size ? catalog.filter((item) => requestedIds.has(item.index)) : catalog;
  for (const item of selected) {
    if (!force && completed.has(item.index)) {
      console.log(`Skipped ${item.index}/${catalog.length}: ${item.name}`);
      continue;
    }
    completed.set(item.index, await search(item));
    const sorted = [...completed.values()].sort((a, b) => a.idMonAn - b.idMonAn);
    await fs.writeFile(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
    console.log(`Found ${item.index}/${catalog.length}: ${item.name}`);
    await wait(850);
  }
  console.log(`Saved ${completed.size}/${catalog.length} videos to scripts/recipe-videos.json`);
}

if (require.main === module) run().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = run;
