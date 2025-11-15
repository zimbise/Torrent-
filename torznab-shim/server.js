// ~/torrent-search-app/torznab-shim/server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

// Paths
const providersPath = path.join(__dirname, 'providers');
const registryPath = path.join(providersPath, 'registry.json');

// Load providers from registry.json
const loadProviders = () => {
  const registry = JSON.parse(fs.readFileSync(registryPath));
  const providers = {};
  registry.providers.forEach(({ name, file }) => {
    const filePath = path.join(providersPath, file);
    if (fs.existsSync(filePath)) {
      providers[name] = JSON.parse(fs.readFileSync(filePath));
    }
  });
  return providers;
};

// API endpoint
app.get('/api', async (req, res) => {
  const query = req.query.q || '';
  const providers = loadProviders();
  const results = [];

  console.log(`Search request: "${query}"`);

  for (const [name, config] of Object.entries(providers)) {
    try {
      const url = config.searchUrl.replace('{query}', encodeURIComponent(query));
      console.log(`Fetching from ${name}: ${url}`);

      const response = await axios.get(url, { timeout: 10000 });
      const $ = cheerio.load(response.data);

      $(config.listSelector).each((_, el) => {
        const item = {};
        for (const [field, def] of Object.entries(config.fields)) {
          if (def.attr === 'text') {
            item[field] = $(el).find(def.selector).text().trim();
          } else {
            item[field] = $(el).find(def.selector).attr(def.attr);
          }
        }
        item.provider = name;
        results.push(item);
      });
    } catch (err) {
      console.error(`Provider ${name} failed: ${err.message}`);
    }
  }

  res.json(results);
});

// Startup
app.listen(PORT, () => {
  console.log(`Torznab shim running at http://localhost:${PORT}`);
  const providers = loadProviders();
  console.log("Loaded providers:");
  Object.keys(providers).forEach(name => {
    console.log(` - ${name}`);
  });
});
