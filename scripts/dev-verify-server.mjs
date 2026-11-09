import http from 'http';
import https from 'https';

/**
 * WOVZO Bio Verification Server - v2 (Multi-Strategy)
 * Tries multiple approaches to scrape Instagram/YouTube bio for the verification code.
 */

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...headers,
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

async function checkInstagramBio(handle, code) {
  const normCode = code.replace(/[^A-Z0-9]/g, '').toUpperCase();

  const strategies = [
    // Strategy 1: Instagram JSON embed API (often works without login)
    async () => {
      const url = `https://www.instagram.com/${handle}/?__a=1&__d=dis`;
      const result = await httpsGet(url, {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
      });
      if (result.status === 200 && result.body.includes('{')) {
        try {
          const json = JSON.parse(result.body);
          const bio = json?.graphql?.user?.biography || json?.data?.user?.biography || '';
          if (bio) {
            const normBio = bio.replace(/[^A-Z0-9]/g, '').toUpperCase();
            return bio.toUpperCase().includes(code) || normBio.includes(normCode);
          }
        } catch {}
      }
      return null;
    },

    // Strategy 2: Mobile page scrape - search for bio in HTML
    async () => {
      const result = await httpsGet(`https://www.instagram.com/${handle}/`, {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 Instagram/303.0.0.32.113',
        'Accept': 'text/html',
      });
      if (result.status === 200) {
        const html = result.body;
        // Look for biography in JSON embedded in page
        const bioMatch = html.match(/"biography"\s*:\s*"([^"]{0,500})"/i);
        if (bioMatch) {
          const bio = bioMatch[1].replace(/\\n/g, ' ').replace(/\\u[\dA-F]{4}/gi, '');
          const normBio = bio.replace(/[^A-Z0-9]/g, '').toUpperCase();
          return bio.toUpperCase().includes(code) || normBio.includes(normCode);
        }
        // Fallback: check full HTML
        const normHtml = html.replace(/[^A-Z0-9]/g, '').toUpperCase();
        return html.toUpperCase().includes(code) || (normCode.length >= 6 && normHtml.includes(normCode));
      }
      return null;
    },

    // Strategy 3: Try Instagram oEmbed API (public, no auth needed)
    async () => {
      const oembedUrl = `https://www.instagram.com/oembed/?url=https://www.instagram.com/${handle}/&format=json`;
      const result = await httpsGet(oembedUrl, {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'application/json',
      });
      if (result.status === 200) {
        try {
          const json = JSON.parse(result.body);
          // oEmbed title sometimes includes bio keywords
          const title = (json?.author_name || '') + ' ' + (json?.title || '');
          const normTitle = title.replace(/[^A-Z0-9]/g, '').toUpperCase();
          if (normCode.length >= 6 && normTitle.includes(normCode)) return true;
        } catch {}
      }
      return null;
    },

    // Strategy 4: Try Google cache scrape
    async () => {
      const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:instagram.com/${handle}/`;
      const result = await httpsGet(cacheUrl, {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Referer': 'https://www.google.com/',
      });
      if (result.status === 200) {
        const html = result.body;
        const normHtml = html.replace(/[^A-Z0-9]/g, '').toUpperCase();
        return html.toUpperCase().includes(code) || normHtml.includes(normCode);
      }
      return null;
    },

    // Strategy 5: Try picuki.com (Instagram viewer proxy)
    async () => {
      const result = await httpsGet(`https://picuki.com/profile/${handle}`, {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Referer': 'https://www.google.com/',
      });
      if (result.status === 200) {
        const html = result.body;
        const normHtml = html.replace(/[^A-Z0-9]/g, '').toUpperCase();
        return html.toUpperCase().includes(code) || normHtml.includes(normCode);
      }
      return null;
    },

    // Strategy 6: Try imginn.com (Instagram viewer proxy)  
    async () => {
      const result = await httpsGet(`https://imginn.com/${handle}/`, {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Referer': 'https://www.google.com/',
      });
      if (result.status === 200) {
        const html = result.body;
        const normHtml = html.replace(/[^A-Z0-9]/g, '').toUpperCase();
        return html.toUpperCase().includes(code) || normHtml.includes(normCode);
      }
      return null;
    },
  ];

  let lastError = null;
  for (const strategy of strategies) {
    try {
      const result = await strategy();
      if (result !== null) {
        return { found: result };
      }
    } catch (err) {
      lastError = err;
      // Try next strategy
    }
  }

  return { found: false, error: lastError?.message || 'All strategies exhausted' };
}

async function checkYouTubeBio(handle, code) {
  const normCode = code.replace(/[^A-Z0-9]/g, '').toUpperCase();

  try {
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const result = await httpsGet(`https://www.youtube.com/${cleanHandle}/about`, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    if (result.status === 200) {
      const html = result.body;
      const normHtml = html.replace(/[^A-Z0-9]/g, '').toUpperCase();
      return { found: html.toUpperCase().includes(code) || normHtml.includes(normCode) };
    }
  } catch (err) {
    return { found: false, error: err.message };
  }

  return { found: false };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost:3001');
  const handle = (url.searchParams.get('handle') || '').replace(/^@+/, '').trim();
  const code = (url.searchParams.get('code') || '').toUpperCase().trim();
  const platform = url.searchParams.get('platform') || 'instagram';

  if (!handle || !code) {
    res.writeHead(200);
    res.end(JSON.stringify({ verified: false, message: 'Handle and code are required.' }));
    return;
  }

  try {
    let checkResult;
    if (platform === 'youtube') {
      checkResult = await checkYouTubeBio(handle, code);
    } else {
      checkResult = await checkInstagramBio(handle, code);
    }

    if (checkResult.found) {
      res.writeHead(200);
      res.end(JSON.stringify({
        verified: true,
        message: `🎉 Verification Succeeded! Your bio code matched. Your account now carries the official Verified Blue Badge!`,
        platform,
        handle,
        code
      }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({
        verified: false,
        message: `❌ Verification Failed: Code ${code} was not found in instagram bio for @${handle}. Please make sure your account is public and you saved the code in your bio, then try again.`,
        platform,
        handle,
        code,
        debug: checkResult.error || undefined
      }));
    }
  } catch (err) {
    res.writeHead(200);
    res.end(JSON.stringify({
      verified: false,
      message: `Error connecting to ${platform}: ${err.message}`,
      platform,
      handle,
      code
    }));
  }
});

server.listen(3001, () => {
  console.log('Dev verification server v2 running on http://localhost:3001');
});
