<?php

require_once dirname(__DIR__) . '/config.php';

function safe_hash_equals($known, $user)
{
    if (function_exists('hash_equals')) {
        return hash_equals($known, $user);
    }

    if (strlen($known) !== strlen($user)) {
        return false;
    }

    $result = 0;
    for ($i = 0; $i < strlen($known); $i++) {
        $result |= ord($known[$i]) ^ ord($user[$i]);
    }

    return $result === 0;
}

$token = isset($_GET['token']) ? $_GET['token'] : '';

if (SIGNUP_EXPORT_TOKEN === 'Huian2026_change_this_token' || !safe_hash_equals(SIGNUP_EXPORT_TOKEN, (string)$token)) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => '无权导出'), JSON_UNESCAPED_UNICODE);
    exit;
}

$csvFile = dirname(dirname(__DIR__)) . '/data/signups.csv.php';

if (!file_exists($csvFile)) {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="huian-signups.csv"');
    echo "\xEF\xBB\xBF记录ID,服务端接收时间,前端提交时间,活动,报名场次,用户名,手机号,来源页面,IP,User-Agent\n";
    exit;
}

$contents = file_get_contents($csvFile);
if ($contents === false) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => '无法读取报名文件'), JSON_UNESCAPED_UNICODE);
    exit;
}

$contents = preg_replace('/^<\?php exit; \?>\r?\n/', '', $contents, 1);

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="huian-signups.csv"');
header('Content-Length: ' . strlen($contents));
echo $contents;
