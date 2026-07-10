<?php

require_once dirname(__DIR__) . '/config.php';

header('Content-Type: application/json; charset=utf-8');

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $SIGNUP_ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

function respond($statusCode, $payload)
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function text_length($text)
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($text, 'UTF-8');
    }

    return strlen($text);
}

function create_record_id()
{
    if (function_exists('random_bytes')) {
        return bin2hex(random_bytes(16));
    }

    if (function_exists('openssl_random_pseudo_bytes')) {
        return bin2hex(openssl_random_pseudo_bytes(16));
    }

    return md5(uniqid('', true) . mt_rand());
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, array('ok' => false, 'message' => '只支持 POST 提交'));
}

$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody ? $rawBody : '{}', true);

if (!is_array($input)) {
    respond(400, array('ok' => false, 'message' => '请求格式错误'));
}

$sessions = isset($input['sessions']) ? $input['sessions'] : array();
$username = trim((string)(isset($input['username']) ? $input['username'] : ''));
$phone = trim((string)(isset($input['phone']) ? $input['phone'] : ''));

if (!is_array($sessions) || count($sessions) === 0) {
    respond(400, array('ok' => false, 'message' => '请选择至少一场观赛活动'));
}

$sessions = array_values(array_filter(array_map(function ($item) {
    return trim((string)$item);
}, $sessions)));

if (count($sessions) === 0) {
    respond(400, array('ok' => false, 'message' => '请选择至少一场观赛活动'));
}

if ($username === '') {
    respond(400, array('ok' => false, 'message' => '请填写用户名'));
}

if (text_length($username) > 20) {
    respond(400, array('ok' => false, 'message' => '用户名不能超过20个字'));
}

if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
    respond(400, array('ok' => false, 'message' => '请填写正确的手机号'));
}

$dataDir = dirname(dirname(__DIR__)) . '/data';
$csvFile = $dataDir . '/signups.csv.php';
$jsonlFile = $dataDir . '/signups.jsonl.php';

if (!is_dir($dataDir) && !mkdir($dataDir, 0755, true)) {
    respond(500, array('ok' => false, 'message' => '无法创建数据目录'));
}

if (!is_writable($dataDir)) {
    respond(500, array('ok' => false, 'message' => '数据目录不可写，请检查 data 目录权限'));
}

$forwardedFor = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? $_SERVER['HTTP_X_FORWARDED_FOR'] : '';
$remoteAddr = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
$ipSource = $forwardedFor !== '' ? $forwardedFor : $remoteAddr;
$ipParts = explode(',', (string)$ipSource);

$record = array(
    'id' => create_record_id(),
    'serverReceivedAt' => gmdate('c'),
    'submittedAt' => (string)(isset($input['submittedAt']) ? $input['submittedAt'] : ''),
    'eventName' => (string)(isset($input['eventName']) ? $input['eventName'] : '2026美加墨世界杯线下观赛招募'),
    'sessions' => $sessions,
    'username' => $username,
    'phone' => $phone,
    'pageUrl' => (string)(isset($input['pageUrl']) ? $input['pageUrl'] : ''),
    'ip' => trim($ipParts[0]),
    'userAgent' => (string)(isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : ''),
);

$isNewCsv = !file_exists($csvFile);
$csvHandle = fopen($csvFile, 'ab');
if (!$csvHandle) {
    respond(500, array('ok' => false, 'message' => '无法写入报名文件'));
}

flock($csvHandle, LOCK_EX);

if ($isNewCsv) {
    fwrite($csvHandle, "<?php exit; ?>\n");
    fwrite($csvHandle, "\xEF\xBB\xBF");
    fputcsv($csvHandle, array('记录ID', '服务端接收时间', '前端提交时间', '活动', '报名场次', '用户名', '手机号', '来源页面', 'IP', 'User-Agent'));
}

fputcsv($csvHandle, array(
    $record['id'],
    $record['serverReceivedAt'],
    $record['submittedAt'],
    $record['eventName'],
    implode(' | ', $record['sessions']),
    $record['username'],
    $record['phone'],
    $record['pageUrl'],
    $record['ip'],
    $record['userAgent'],
));

flock($csvHandle, LOCK_UN);
fclose($csvHandle);

if (!file_exists($jsonlFile)) {
    file_put_contents($jsonlFile, "<?php exit; ?>\n", LOCK_EX);
}
file_put_contents($jsonlFile, json_encode($record, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);

respond(200, array('ok' => true, 'id' => $record['id'], 'message' => '报名成功'));
