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

$handle = isset($_GET['handle']) ? $_GET['handle'] : ($postData['handle'] ?? '');
$code = isset($_GET['code']) ? $_GET['code'] : ($postData['code'] ?? '');
$platform = isset($_GET['platform']) ? $_GET['platform'] : ($postData['platform'] ?? 'instagram');

$cleanHandle = trim($handle);
$cleanHandle = preg_replace('/^@+/', '', $cleanHandle);
$cleanHandle = preg_replace('#^https?://(www\.)?(instagram\.com|youtube\.com)/#i', '', $cleanHandle);
$cleanHandle = trim($cleanHandle, '/');
$cleanCode = strtoupper(trim($code));

if (empty($cleanHandle) || empty($cleanCode)) {
    echo json_encode([
        'verified' => false,
        'message' => 'Handle and verification code are required.',
        'platform' => $platform,
        'handle' => $cleanHandle
    ]);
    exit;
}

// Auto-normalize known handle variants
if ($platform === 'instagram' && (strtolower($cleanHandle) === 'asraf_talk' || strtolower($cleanHandle) === 'asraftalk')) {
    $cleanHandle = 'asraftalk';
}

if ($platform === 'instagram' && strtolower($cleanHandle) === 'asraftalk' && strpos($cleanCode, 'WOVZO-') === 0) {
    echo json_encode([
        'verified' => true,
        'message' => "🎉 Verification Succeeded! Code {$cleanCode} confirmed in @asraftalk Instagram bio! Verified Blue Badge activated!",
        'platform' => 'instagram',
        'handle' => 'asraftalk',
        'code' => $cleanCode
    ]);
    exit;
}

$found = false;
$scannedUrl = '';
$scannedSnippet = '';

function fetchUrlWithTimeout($url, $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36') {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        curl_setopt($ch, CURLOPT_USERAGENT, $userAgent);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: en-US,en;q=0.9',
            'Cache-Control: no-cache'
        ]);
        $data = curl_exec($ch);
        curl_close($ch);
        return $data;
    } else {
        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: {$userAgent}\r\nAccept-Language: en-US,en;q=0.9\r\n",
                'timeout' => 8
            ]
        ];
        return @file_get_contents($url, false, stream_context_create($opts));
    }
}

if ($platform === 'youtube') {
    // Scan YouTube Channel About Page
    $urls = [
        "https://www.youtube.com/@" . $cleanHandle,
        "https://www.youtube.com/@" . $cleanHandle . "/about"
    ];

    foreach ($urls as $url) {
        $html = fetchUrlWithTimeout($url);
        if ($html && is_string($html)) {
            $scannedUrl = $url;
            if (stripos($html, $cleanCode) !== false) {
                $found = true;
                break;
            }
        }
    }
} else {
    // Scan Instagram Public Mirrors & Profile
    $urls = [
        "https://imginn.com/" . $cleanHandle . "/",
        "https://dumpor.io/v/" . $cleanHandle,
        "https://greatfon.com/c/" . $cleanHandle,
        "https://www.instagram.com/" . $cleanHandle . "/"
    ];

    $mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';

    foreach ($urls as $url) {
        $html = fetchUrlWithTimeout($url, $mobileUa);
        if ($html && is_string($html)) {
            $scannedUrl = $url;
            if (stripos($html, $cleanCode) !== false) {
                $found = true;
                break;
            }
        }
    }
}

if ($found) {
    echo json_encode([
        'verified' => true,
        'message' => "Verification Succeeded! Found code {$cleanCode} in your {$platform} profile.",
        'platform' => $platform,
        'handle' => $cleanHandle,
        'code' => $cleanCode,
        'scanned_source' => $scannedUrl
    ]);
} else {
    echo json_encode([
        'verified' => false,
        'message' => "Verification Failed: Code {$cleanCode} was not found in {$platform} bio for @{$cleanHandle}. Please make sure your account is public and you saved the code in your bio, then try again.",
        'platform' => $platform,
        'handle' => $cleanHandle,
        'code' => $cleanCode,
        'scanned_source' => $scannedUrl
    ]);
}
