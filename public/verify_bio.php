<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$rawInput = file_get_contents('php://input');
$postData = json_decode($rawInput, true) ?: [];

$action = isset($_GET['action']) ? $_GET['action'] : ($postData['action'] ?? 'verify');
$handle = isset($_GET['handle']) ? $_GET['handle'] : ($postData['handle'] ?? '');
$code = isset($_GET['code']) ? $_GET['code'] : ($postData['code'] ?? '');
$platform = isset($_GET['platform']) ? $_GET['platform'] : ($postData['platform'] ?? 'instagram');
$accountType = isset($_GET['account_type']) ? $_GET['account_type'] : ($postData['account_type'] ?? 'creator');

$cleanHandle = trim($handle);
$cleanHandle = preg_replace('/^@+/', '', $cleanHandle);
$cleanHandle = preg_replace('#^https?://(www\.)?(instagram\.com|youtube\.com)/#i', '', $cleanHandle);
$cleanHandle = trim($cleanHandle, '/');
$cleanCode = strtoupper(trim($code));

// 1. ACTION: CREATE CHALLENGE
if ($action === 'create_challenge') {
    if (empty($cleanHandle)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Social handle is required.']);
        exit;
    }

    $chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    $randomStr = '';
    for ($i = 0; $i < 6; $i++) {
        $randomStr .= $chars[random_int(0, strlen($chars) - 1)];
    }
    $generatedCode = 'WOVZO-VERIFY-' . $randomStr;
    $challengeId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    $expiresAt = time() + (30 * 60);

    echo json_encode([
        'success' => true,
        'challenge_id' => $challengeId,
        'verification_code' => $generatedCode,
        'platform' => $platform,
        'handle' => $cleanHandle,
        'account_type' => $accountType,
        'expires_at' => date('c', $expiresAt),
        'expires_in_seconds' => 1800,
        'instructions' => "Copy code {$generatedCode} and add it to your " . ($platform === 'instagram' ? 'Instagram Bio' : 'YouTube Channel Description') . ". Then click 'Verify Account'."
    ]);
    exit;
}

// 2. ACTION: VERIFY BIO
if (empty($cleanHandle) || empty($cleanCode)) {
    echo json_encode([
        'verified' => false,
        'message' => 'Handle and verification code are required.',
        'platform' => $platform,
        'handle' => $cleanHandle
    ]);
    exit;
}

function fetchUrlWithTimeout($url, $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36') {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        @curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 4);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);
        curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_ENCODING, '');
        $data = curl_exec($ch);
        curl_close($ch);
        return $data;
    }
    return false;
}

$found = false;
$normCode = preg_replace('/[^A-Z0-9]/', '', $cleanCode);
$platformAccountId = '';

if ($platform === 'youtube') {
    $urls = [
        "https://www.youtube.com/@" . $cleanHandle . "/about",
        "https://www.youtube.com/@" . $cleanHandle
    ];

    foreach ($urls as $url) {
        $html = fetchUrlWithTimeout($url);
        if ($html && is_string($html)) {
            $decoded = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $normHtml = preg_replace('/[^A-Z0-9]/', '', strtoupper($decoded));
            if (stripos($decoded, $cleanCode) !== false || (strlen($normCode) >= 6 && strpos($normHtml, $normCode) !== false)) {
                $found = true;
                if (preg_match('/"channelId":"(UC[a-zA-Z0-9_-]{22})"/', $html, $matches)) {
                    $platformAccountId = $matches[1];
                }
                break;
            }
        }
    }
} else {
    $urls = [
        "https://www.instagram.com/" . $cleanHandle . "/",
        "https://www.instagram.com/" . $cleanHandle . "/?__a=1&__d=dis",
        "https://picuki.com/profile/" . $cleanHandle
    ];

    $mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

    foreach ($urls as $url) {
        $html = fetchUrlWithTimeout($url, $mobileUa);
        if ($html && is_string($html)) {
            $decoded = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $normHtml = preg_replace('/[^A-Z0-9]/', '', strtoupper($decoded));
            if (stripos($decoded, $cleanCode) !== false || (strlen($normCode) >= 6 && strpos($normHtml, $normCode) !== false)) {
                $found = true;
                $platformAccountId = 'IG_' . $cleanHandle;
                break;
            }
        }
    }
}

if ($found) {
    echo json_encode([
        'verified' => true,
        'success' => true,
        'status' => 'verified',
        'message' => "🎉 Verification Succeeded! Your {$platform} bio was verified with code {$cleanCode}.",
        'platform' => $platform,
        'handle' => $cleanHandle,
        'code' => $cleanCode,
        'platform_account_id' => $platformAccountId ?: ($platform . '_' . $cleanHandle),
        'verified_at' => date('c')
    ]);
} else {
    echo json_encode([
        'verified' => false,
        'success' => false,
        'status' => 'failed',
        'message' => "Verification Failed: Code {$cleanCode} was not found in {$platform} bio for @{$cleanHandle}. Please make sure your account is public and you saved the code in your bio, then try again.",
        'platform' => $platform,
        'handle' => $cleanHandle,
        'code' => $cleanCode
    ]);
}
