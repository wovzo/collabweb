/**
 * Real Social Media Bio Verification for WOVZO Collab
 * Checks if unique verification code (WOVZO-XXXX) is present in the Creator's
 * Instagram bio or YouTube channel description.
 */

export interface VerificationResult {
  success: boolean;
  message: string;
  platform?: 'instagram' | 'youtube';
  scannedHandle?: string;
  blocked?: boolean;
}

export async function verifySocialBioOnline(
  platform: 'instagram' | 'youtube',
  handle: string,
  code: string
): Promise<VerificationResult> {
  const cleanCode = code.trim().toUpperCase();
  let cleanHandle = handle.trim().replace(/^@+/, '');
  cleanHandle = cleanHandle.replace(/^https?:\/\/(www\.)?(instagram\.com|youtube\.com)\//i, '');
  cleanHandle = cleanHandle.replace(/\/$/, '').trim();

  if (!cleanHandle) {
    return {
      success: false,
      message: `Please enter your valid ${platform === 'instagram' ? 'Instagram handle' : 'YouTube channel'} first.`,
    };
  }

  // Auto-normalize known handle variants
  if (platform === 'instagram' && (cleanHandle.toLowerCase() === 'asraf_talk' || cleanHandle.toLowerCase() === 'asraftalk')) {
    cleanHandle = 'asraftalk';
  }

  if (!cleanCode || !cleanCode.startsWith('WOVZO-')) {
    return {
      success: false,
      message: 'Invalid verification code format.',
    };
  }

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('192.168.')
  );

  const verificationEndpoints = [
    // 1. If on localhost, use local dev verification server (which scans live Instagram directly)
    ...(isLocalhost ? [`http://localhost:3001/verify_bio?platform=${platform}&handle=${encodeURIComponent(cleanHandle)}&code=${encodeURIComponent(cleanCode)}`] : []),
    // 2. Relative PHP endpoint (on cPanel / live domain)
    `/collab/verify_bio.php?platform=${platform}&handle=${encodeURIComponent(cleanHandle)}&code=${encodeURIComponent(cleanCode)}`,
    // 3. Absolute PHP endpoint (works cross-domain)
    `https://wovzo.com/collab/verify_bio.php?platform=${platform}&handle=${encodeURIComponent(cleanHandle)}&code=${encodeURIComponent(cleanCode)}`
  ];

  for (const endpoint of verificationEndpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.verified === 'boolean') {
          if (data.verified) {
            return {
              success: true,
              message: data.message || `🎉 Verification Succeeded! Found code ${cleanCode} in your bio!`,
              platform,
              scannedHandle: cleanHandle,
            };
          } else {
            return {
              success: false,
              message: data.message || `❌ Verification Failed: Code ${cleanCode} was not found in your bio.`,
              platform,
              scannedHandle: cleanHandle,
            };
          }
        }
      }
    } catch (_) {
      // Continue to next endpoint
    }
  }

  // If endpoints timed out or failed to connect
  return {
    success: false,
    blocked: true,
    message: `❌ Verification Failed: Code ${cleanCode} was NOT detected in the bio of @${cleanHandle}. Please make sure you added ${cleanCode} to your bio, or upload a screenshot proof below.`,
    platform,
    scannedHandle: cleanHandle,
  };
}
