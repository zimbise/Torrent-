const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const providersPath = path.join(process.env.HOME, 'torrent-search-app/app/src/main/assets/providers');
const registry = JSON.parse(fs.readFileSync(path.join(providersPath, 'providers.json'), 'utf8')).providers;

function parseHtml(html, config) {
  const $ = cheerio.load(html);
  const results = [];
  $(config.titleSelector).each((i, el) => {
    const title = $(el).text().trim();
    const linkEl = config.linkSelector ? $(config.linkSelector).eq(i) : $(el);
    const href = linkEl.attr('href') || '';
    const seeds = config.seedSelector ? $(config.seedSelector).eq(i).text().trim() : null;
    const leeches = config.leechSelector ? $(config.leechSelector).eq(i).text().trim() : null;
    if (title) {
      results.push({ provider: config.name || '', title, seeds, leeches, magnet: href });
    }
  });
  return results;
}

async function searchProvider(p, query) {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(providersPath, p.file), 'utf8'));
    const url = config.searchUrl.replace('{query}', encodeURIComponent(query));
    const resp = await fetch(url, { headers: config.headers || { "User-Agent": "Mozilla/5.0" } });
    const text = await resp.text();

    if (config.type === 'xml') {
      const parsed = await xml2js.parseStringPromise(text);
      const items = (((parsed || {}).rss || {}).channel || [])[0]?.item || [];
      return items.map(item => ({
        provider: p.name,
        title: item.title?.[0] || '',
        magnet: item.enclosure?.[0]?.$.url || '',
        seeds: item['torznab:attr']?.find(a => a.$.name === 'seeders')?.$.value || null,
        leeches: item['torznab:attr']?.find(a => a.$.name === 'peers')?.$.value || null
      }));
    } else {
      return parseHtml(text, config);
    }
  } catch (err) {
    console.error(`Error in ${p.name}:`, err.message);
    return [];
  }
}

async function searchAllProviders(query) {
  const results = [];
  for (const p of registry) {
    if (p.enabled !== false) {
      const parsed = await searchProvider(p, query);
      results.push(...parsed);
    }
  }
  return results;
}

app.get('/api/v2.0/indexers/all/results', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  const results = await searchAllProviders(q);
  res.json(results);
});

app.get('/', (req, res) => {
  res.send(`Shim running with ${registry.length} providers`);
});

app.listen(PORT, () => {
  console.log(`Shim listening on http://127.0.0.1:${PORT}`);
});
