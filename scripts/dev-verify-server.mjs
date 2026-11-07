import http from 'http';

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
    let targetUrl = `https://www.instagram.com/${handle}/`;
    let userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';

    if (platform === 'youtube') {
      targetUrl = `https://www.youtube.com/@${handle}`;
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const html = await response.text();
    const normHtml = html.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const normCode = code.replace(/[^A-Z0-9]/g, '');

    const found = html.toUpperCase().includes(code) || (normCode.length >= 6 && normHtml.includes(normCode));

    if (found) {
      res.writeHead(200);
      res.end(JSON.stringify({
        verified: true,
        message: `🎉 Verification Succeeded! Code ${code} found in @${handle}'s ${platform} bio!`,
        platform,
        handle,
        code
      }));
      return;
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({
        verified: false,
        message: `❌ Verification Failed: Code ${code} was not found in ${platform} bio for @${handle}. Please make sure your account is public and you saved the code in your bio, then try again.`,
        platform,
        handle,
        code
      }));
      return;
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
  console.log('Dev verification server running on http://localhost:3001');
});
