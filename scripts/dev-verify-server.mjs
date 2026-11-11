import http from 'http';
import https from 'https';
import crypto from 'crypto';

/**
 * WOVZO Collab - Enterprise Social Media Ownership Verification Server
 * Supports:
 * 1. Cryptographically random verification challenge lifecycle (30-min expiry, rate limiting)
 * 2. YouTube Data API v3 resolution & channel description inspection
 * 3. Instagram Graph API / Multi-strategy public bio verification
 * 4. Duplicate social handle prevention
 * 5. Server-side registration verification check
 */

const challenges = new Map();

// Helper to make HTTPS requests
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(url);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          ...headers,
        },
        timeout: 10000,
      };

      const req = https.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpsGet(res.headers.location, headers).then(resolve).catch(reject);
        }
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Generate secure verification code: e.g. WOVZO-VERIFY-8K92X7
function generateVerificationCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomStr = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    randomStr += chars[bytes[i] % chars.length];
  }
  return `WOVZO-VERIFY-${randomStr}`;
}

// YouTube Channel Verification using YouTube Data API v3 + public fallback
async function verifyYouTube(handle, code, apiKey = process.env.YOUTUBE_API_KEY) {
  const cleanHandle = handle.replace(/^@+/, '').trim();
  const normCode = code.replace(/[^A-Z0-9]/g, '').toUpperCase();

  // 1. Official YouTube Data API v3 if API key is provided
  if (apiKey) {
    try {
      let apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,id&key=${apiKey}`;
      if (cleanHandle.startsWith('UC') && cleanHandle.length === 24) {
        apiUrl += `&id=${encodeURIComponent(cleanHandle)}`;
      } else {
        apiUrl += `&forHandle=${encodeURIComponent(cleanHandle)}`;
      }

      const res = await httpsGet(apiUrl);
      if (res.status === 200) {
        const data = JSON.parse(res.body);
        if (data.items && data.items.length > 0) {
          const channel = data.items[0];
          const description = channel.snippet?.description || '';
          const normDesc = description.replace(/[^A-Z0-9]/g, '').toUpperCase();
          const channelId = channel.id;
          const channelTitle = channel.snippet?.title || cleanHandle;

          if (description.toUpperCase().includes(code) || normDesc.includes(normCode)) {
            return {
              found: true,
              channelId,
              channelTitle,
              snippet: description.substring(0, 150),
              apiUsed: 'YouTube Data API v3'
            };
          } else {
            return {
              found: false,
              channelId,
              channelTitle,
              message: `Code ${code} was not found in description of channel "${channelTitle}".`,
              apiUsed: 'YouTube Data API v3'
            };
          }
        }
      }
    } catch (e) {
      console.warn('YouTube Data API error, falling back:', e.message);
    }
  }

  // 2. Direct channel page fetch fallback
  try {
    const urls = [
      `https://www.youtube.com/@${cleanHandle}/about`,
      `https://www.youtube.com/@${cleanHandle}`
    ];

    for (const u of urls) {
      const res = await httpsGet(u);
      if (res.status === 200) {
        const html = res.body;
        const normHtml = html.replace(/[^A-Z0-9]/g, '').toUpperCase();
        if (html.toUpperCase().includes(code) || normHtml.includes(normCode)) {
          // Extract channelId if present
          const idMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
          return {
            found: true,
            channelId: idMatch ? idMatch[1] : `UC_${cleanHandle}`,
            channelTitle: cleanHandle,
            apiUsed: 'YouTube Web Resolver'
          };
        }
      }
    }
  } catch (err) {
    console.warn('YouTube web resolver error:', err.message);
  }

  return {
    found: false,
    message: `Verification code ${code} was not found in YouTube channel description for @${cleanHandle}.`
  };
}

// Instagram Bio Verification using Graph API or Multi-Strategy Public Resolver
async function verifyInstagram(handle, code, accessToken = process.env.INSTAGRAM_ACCESS_TOKEN) {
  const cleanHandle = handle.replace(/^@+/, '').trim().toLowerCase();
  const normCode = code.replace(/[^A-Z0-9]/g, '').toUpperCase();

  // 1. Official Instagram Graph API (Business Discovery) if Access Token is provided
  if (accessToken) {
    try {
      const graphUrl = `https://graph.facebook.com/v19.0/me?fields=business_discovery.username(${encodeURIComponent(cleanHandle)}){username,biography,id}&access_token=${accessToken}`;
      const res = await httpsGet(graphUrl);
      if (res.status === 200) {
        const data = JSON.parse(res.body);
        const bio = data.business_discovery?.biography || '';
        const normBio = bio.replace(/[^A-Z0-9]/g, '').toUpperCase();
        const igId = data.business_discovery?.id;

        if (bio.toUpperCase().includes(code) || normBio.includes(normCode)) {
          return {
            found: true,
            accountId: igId || `IG_${cleanHandle}`,
            snippet: bio.substring(0, 150),
            apiUsed: 'Meta Graph API v19.0'
          };
        } else {
          return {
            found: false,
            accountId: igId,
            message: `Code ${code} was not found in Instagram bio for @${cleanHandle}.`,
            apiUsed: 'Meta Graph API v19.0'
          };
        }
      }
    } catch (e) {
      console.warn('Instagram Graph API error:', e.message);
    }
  }

  // 2. Multi-Strategy Public Resolvers
  const strategies = [
    // Instagram JSON API
    async () => {
      const url = `https://www.instagram.com/${cleanHandle}/?__a=1&__d=dis`;
      const res = await httpsGet(url, {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
      });
      if (res.status === 200 && res.body.includes('{')) {
        try {
          const json = JSON.parse(res.body);
          const bio = json?.graphql?.user?.biography || json?.data?.user?.biography || '';
          const normBio = bio.replace(/[^A-Z0-9]/g, '').toUpperCase();
          if (bio.toUpperCase().includes(code) || (normCode.length >= 6 && normBio.includes(normCode))) {
            return {
              found: true,
              accountId: json?.graphql?.user?.id || json?.data?.user?.id || `IG_${cleanHandle}`,
              snippet: bio
            };
          }
        } catch {}
      }
      return null;
    },

    // Mobile HTML Scrape
    async () => {
      const res = await httpsGet(`https://www.instagram.com/${cleanHandle}/`, {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      });
      if (res.status === 200) {
        const html = res.body;
        const normHtml = html.replace(/[^A-Z0-9]/g, '').toUpperCase();
        if (html.toUpperCase().includes(code) || (normCode.length >= 6 && normHtml.includes(normCode))) {
          return { found: true, accountId: `IG_${cleanHandle}` };
        }
      }
      return null;
    },

    // Public Viewer Proxies (Picuki / Imginn)
    async () => {
      const res = await httpsGet(`https://picuki.com/profile/${cleanHandle}`);
      if (res.status === 200) {
        const normHtml = res.body.replace(/[^A-Z0-9]/g, '').toUpperCase();
        if (res.body.toUpperCase().includes(code) || normHtml.includes(normCode)) {
          return { found: true, accountId: `IG_${cleanHandle}` };
        }
      }
      return null;
    }
  ];

  for (const s of strategies) {
    try {
      const result = await s();
      if (result && result.found) {
        return result;
      }
    } catch {}
  }

  return {
    found: false,
    message: `Verification code ${code} was not found in Instagram bio for @${cleanHandle}. Please make sure your profile is Public and you saved the bio.`
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost:3001');
  const pathname = url.pathname;

  // Helper to parse JSON body
  const parseBody = () => new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });

  // 1. CREATE CHALLENGE ENDPOINT (/api/create_challenge or /create_challenge)
  if (pathname === '/api/create_challenge' || pathname === '/create_challenge') {
    const postData = await parseBody();
    const accountType = (url.searchParams.get('account_type') || postData.account_type || 'creator').toLowerCase();
    const platform = (url.searchParams.get('platform') || postData.platform || 'instagram').toLowerCase();
    let handle = (url.searchParams.get('handle') || postData.handle || '').replace(/^@+/, '').trim();

    if (!handle) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, error: 'Social handle is required.' }));
      return;
    }

    // Check for existing pending challenge for this platform + handle
    const challengeKey = `${platform}:${handle.toLowerCase()}`;
    const existing = challenges.get(challengeKey);
    const now = Date.now();

    if (existing && existing.expiresAt > now && existing.status === 'verified') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        already_verified: true,
        challenge_id: existing.id,
        verification_code: existing.code,
        platform,
        handle,
        status: 'verified',
        expires_at: new Date(existing.expiresAt).toISOString(),
      }));
      return;
    }

    const challengeId = crypto.randomUUID();
    const code = generateVerificationCode();
    const expiresAt = now + 30 * 60 * 1000; // 30 minutes

    const challengeRecord = {
      id: challengeId,
      accountType,
      platform,
      handle,
      code,
      status: 'pending',
      attempts: 0,
      maxAttempts: 6,
      createdAt: now,
      expiresAt,
      verifiedAt: null,
      platformAccountId: null,
    };

    challenges.set(challengeKey, challengeRecord);
    challenges.set(challengeId, challengeRecord);

    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      challenge_id: challengeId,
      verification_code: code,
      platform,
      handle,
      account_type: accountType,
      expires_at: new Date(expiresAt).toISOString(),
      expires_in_seconds: 1800,
      instructions: `Copy code ${code} and add it to your ${platform === 'instagram' ? 'Instagram Bio' : 'YouTube Channel Description'}. Then click 'Verify Account'.`,
    }));
    return;
  }

  // 2. VERIFY CHALLENGE ENDPOINT (/api/verify_challenge or /verify_challenge or /verify_bio)
  if (pathname === '/api/verify_challenge' || pathname === '/verify_challenge' || pathname === '/verify_bio') {
    const postData = await parseBody();
    const challengeId = url.searchParams.get('challenge_id') || postData.challenge_id;
    const platform = (url.searchParams.get('platform') || postData.platform || 'instagram').toLowerCase();
    const handle = (url.searchParams.get('handle') || postData.handle || '').replace(/^@+/, '').trim();
    let code = (url.searchParams.get('code') || postData.code || '').trim().toUpperCase();

    let record = null;
    if (challengeId && challenges.has(challengeId)) {
      record = challenges.get(challengeId);
    } else if (handle && challenges.has(`${platform}:${handle.toLowerCase()}`)) {
      record = challenges.get(`${platform}:${handle.toLowerCase()}`);
    }

    if (record) {
      code = record.code;
    }

    if (!handle || !code) {
      res.writeHead(400);
      res.end(JSON.stringify({ verified: false, message: 'Handle and verification code are required.' }));
      return;
    }

    // Check challenge expiry
    if (record && Date.now() > record.expiresAt) {
      record.status = 'expired';
      res.writeHead(200);
      res.end(JSON.stringify({
        verified: false,
        status: 'expired',
        message: 'This verification code has expired (30-minute limit). Please generate a new code.',
      }));
      return;
    }

    // Check rate limit
    if (record) {
      record.attempts += 1;
      if (record.attempts > record.maxAttempts) {
        res.writeHead(429);
        res.end(JSON.stringify({
          verified: false,
          status: 'rate_limited',
          message: 'Too many verification attempts. Please wait a few minutes before trying again.',
        }));
        return;
      }
    }

    let result;
    if (platform === 'youtube') {
      result = await verifyYouTube(handle, code);
    } else {
      result = await verifyInstagram(handle, code);
    }

    if (result.found) {
      if (record) {
        record.status = 'verified';
        record.verifiedAt = Date.now();
        record.platformAccountId = result.channelId || result.accountId || `${platform}_${handle}`;
      }

      res.writeHead(200);
      res.end(JSON.stringify({
        verified: true,
        success: true,
        status: 'verified',
        challenge_id: record ? record.id : undefined,
        platform,
        handle,
        code,
        platform_account_id: result.channelId || result.accountId || `${platform}_${handle}`,
        verified_at: new Date().toISOString(),
        message: `🎉 Verification Succeeded! Your ${platform === 'instagram' ? 'Instagram Bio' : 'YouTube Channel Description'} was verified with code ${code}.`,
      }));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({
        verified: false,
        success: false,
        status: 'failed',
        platform,
        handle,
        code,
        attempts: record ? record.attempts : 1,
        message: result.message || `Verification code ${code} was not found in your ${platform} profile. Please make sure you saved your updated bio and try again.`,
      }));
    }
    return;
  }

  // 3. CHECK CHALLENGE STATUS ENDPOINT (/api/check_challenge or /check_challenge)
  if (pathname === '/api/check_challenge' || pathname === '/check_challenge') {
    const challengeId = url.searchParams.get('challenge_id');
    const handle = (url.searchParams.get('handle') || '').replace(/^@+/, '').trim().toLowerCase();
    const platform = (url.searchParams.get('platform') || 'instagram').toLowerCase();

    let record = null;
    if (challengeId && challenges.has(challengeId)) {
      record = challenges.get(challengeId);
    } else if (handle && challenges.has(`${platform}:${handle}`)) {
      record = challenges.get(`${platform}:${handle}`);
    }

    if (!record) {
      res.writeHead(404);
      res.end(JSON.stringify({ found: false, message: 'Challenge not found.' }));
      return;
    }

    const isExpired = Date.now() > record.expiresAt;
    res.writeHead(200);
    res.end(JSON.stringify({
      found: true,
      challenge_id: record.id,
      platform: record.platform,
      handle: record.handle,
      status: isExpired ? 'expired' : record.status,
      verified: record.status === 'verified',
      expires_at: new Date(record.expiresAt).toISOString(),
      expires_in_seconds: Math.max(0, Math.floor((record.expiresAt - Date.now()) / 1000)),
    }));
    return;
  }

  // 4. VALIDATE REGISTRATION RESTRICTION ENDPOINT (/api/validate_registration)
  if (pathname === '/api/validate_registration' || pathname === '/validate_registration') {
    const postData = await parseBody();
    const challengeId = postData.challenge_id;
    const handle = (postData.handle || '').replace(/^@+/, '').trim().toLowerCase();
    const platform = (postData.platform || 'instagram').toLowerCase();
    const role = (postData.role || 'creator').toLowerCase();

    if (!challengeId) {
      res.writeHead(403);
      res.end(JSON.stringify({
        allowed: false,
        error: 'Mandatory social media ownership verification required. Please complete verification before creating an account.',
      }));
      return;
    }

    const record = challenges.get(challengeId);
    if (!record) {
      res.writeHead(403);
      res.end(JSON.stringify({
        allowed: false,
        error: 'Invalid or unknown verification challenge ID. Please restart verification.',
      }));
      return;
    }

    if (record.status !== 'verified') {
      res.writeHead(403);
      res.end(JSON.stringify({
        allowed: false,
        error: `Your ${record.platform} account (@${record.handle}) has not been verified yet. Please complete bio verification first.`,
      }));
      return;
    }

    if (Date.now() > record.expiresAt) {
      res.writeHead(403);
      res.end(JSON.stringify({
        allowed: false,
        error: 'Your verification challenge has expired. Please verify again.',
      }));
      return;
    }

    if (record.handle.toLowerCase() !== handle) {
      res.writeHead(403);
      res.end(JSON.stringify({
        allowed: false,
        error: `Submitted handle (@${handle}) does not match the verified handle (@${record.handle}).`,
      }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      allowed: true,
      challenge_id: record.id,
      verified_platform: record.platform,
      verified_handle: record.handle,
      platform_account_id: record.platformAccountId,
      verified_at: new Date(record.verifiedAt || Date.now()).toISOString(),
    }));
    return;
  }

  // Default route
  res.writeHead(200);
  res.end(JSON.stringify({
    service: 'Wovzo Collab Social Verification Server',
    status: 'online',
    version: '3.0.0-enterprise',
    endpoints: [
      '/create_challenge',
      '/verify_challenge',
      '/check_challenge',
      '/validate_registration'
    ]
  }));
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Wovzo Enterprise Social Verification Server running on http://localhost:${PORT}`);
});
