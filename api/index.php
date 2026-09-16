<?php
// StockFlow InfinityFree JSON API. Storage is kept outside the public API directory.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$storageDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage';
if (!is_dir($storageDir)) {
    mkdir($storageDir, 0750, true);
}

function respond($payload, $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function readStore($name) {
    global $storageDir;
    $path = $storageDir . DIRECTORY_SEPARATOR . $name . '.json';
    if (!file_exists($path)) return array();
    $contents = file_get_contents($path);
    $decoded = json_decode($contents, true);
    return is_array($decoded) ? $decoded : array();
}

function writeStore($name, $records) {
    global $storageDir;
    $path = $storageDir . DIRECTORY_SEPARATOR . $name . '.json';
    $temp = $path . '.tmp';
    $handle = fopen($temp, 'c');
    if (!$handle || !flock($handle, LOCK_EX)) respond(array('success' => false, 'error' => 'Storage is busy.'), 503);
    ftruncate($handle, 0);
    fwrite($handle, json_encode(array_values($records), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    rename($temp, $path);
}

function currentUser($payload) {
    $token = isset($payload['token']) ? $payload['token'] : '';
    foreach (readStore('sessions') as $session) {
        if (hash_equals($session['token'], $token) && strtotime($session['expiresAt']) > time()) return $session['user'];
    }
    return array();
}

function requireAdmin($user) {
    if (!in_array(isset($user['role']) ? $user['role'] : '', array('Admin', 'Super Admin'), true)) {
        respond(array('success' => false, 'error' => 'Administrator access required.'), 403);
    }
}

function makeId($prefix) {
    return $prefix . '-' . gmdate('YmdHis') . '-' . mt_rand(1000, 9999);
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '{}', true);
if (!is_array($payload)) $payload = $_POST;
$action = isset($payload['action']) ? $payload['action'] : 'ping';
$user = currentUser($payload);

if ($action === 'ping') respond(array('success' => true, 'message' => 'StockFlow InfinityFree PHP API is active', 'version' => '3.0.0-hosted'));

if ($action === 'login') {
    $email = strtolower(trim(isset($payload['email']) ? $payload['email'] : ''));
    $pin = trim(isset($payload['pin']) ? $payload['pin'] : '');
    foreach (readStore('users') as $record) {
        if (strtolower($record['email']) === $email && ($record['status'] ?: 'Active') === 'Active' && password_verify($pin, $record['pinHash'])) {
            unset($record['pinHash']);
            $token = bin2hex(random_bytes(32));
            $sessions = readStore('sessions');
            $sessions[] = array('token' => $token, 'user' => $record, 'expiresAt' => gmdate('c', time() + 28800));
            writeStore('sessions', $sessions);
            respond(array('success' => true, 'user' => $record, 'token' => $token));
        }
    }
    respond(array('success' => false, 'error' => 'Invalid user email or PIN.'), 401);
}

if ($action === 'syncAll') {
    if (!$user) respond(array('success' => false, 'error' => 'Authentication required.'), 401);
    respond(array('success' => true, 'timestamp' => gmdate('c'), 'data' => array(
        'users' => array_map(function ($u) { unset($u['pinHash']); return $u; }, readStore('users')),
        'products' => readStore('products'), 'inventory' => readStore('inventory'), 'imei' => readStore('imei'),
        'transactions' => readStore('transactions'), 'transfers' => readStore('transfers'), 'sales' => readStore('sales'),
        'customers' => readStore('customers'), 'suppliers' => readStore('suppliers'), 'locations' => readStore('locations'),
        'repairs' => readStore('repairs'), 'settings' => readStore('settings'), 'tasks' => readStore('tasks')
    )));
}

requireAdmin($user);

if ($action === 'saveUser') {
    $name = trim(isset($payload['name']) ? $payload['name'] : '');
    $email = strtolower(trim(isset($payload['email']) ? $payload['email'] : ''));
    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(array('success' => false, 'error' => 'Valid name and email are required.'), 422);
    $users = readStore('users');
    $users[] = array('id' => makeId('USR'), 'name' => $name, 'email' => $email, 'role' => $payload['role'] ?: 'Viewer', 'location' => $payload['location'] ?: 'Main House', 'status' => 'Active', 'pinHash' => password_hash($payload['pin'] ?: '123456', PASSWORD_DEFAULT), 'createdAt' => gmdate('c'));
    writeStore('users', $users);
    respond(array('success' => true, 'message' => 'User account created.'));
}

if ($action === 'saveTaskBatch') {
    $assignee = strtolower(trim(isset($payload['assigneeEmail']) ? $payload['assigneeEmail'] : ''));
    $titles = isset($payload['tasks']) && is_array($payload['tasks']) ? $payload['tasks'] : array();
    if ($assignee === '' || !$titles) respond(array('success' => false, 'error' => 'Assignee and tasks are required.'), 422);
    $tasks = readStore('tasks');
    $created = array();
    foreach ($titles as $title) {
        $title = trim($title);
        if ($title === '') continue;
        $task = array('id' => makeId('TSK'), 'title' => $title, 'assigneeEmail' => $assignee, 'status' => 'Open', 'createdBy' => $user['email'], 'createdAt' => gmdate('c'));
        $tasks[] = $task;
        $created[] = $task;
    }
    writeStore('tasks', $tasks);
    respond(array('success' => true, 'tasks' => $created, 'message' => count($created) . ' task(s) assigned.'));
}

if ($action === 'bulkImport') {
    $entity = isset($payload['entity']) ? preg_replace('/[^a-z0-9_]/i', '', $payload['entity']) : '';
    $records = isset($payload['records']) && is_array($payload['records']) ? $payload['records'] : array();
    $allowed = array('products', 'inventory', 'customers', 'suppliers', 'repairs');
    if (!in_array($entity, $allowed, true) || !$records) respond(array('success' => false, 'error' => 'Valid import entity and records are required.'), 422);
    $existing = readStore($entity);
    foreach ($records as $record) {
        if (is_array($record)) $existing[] = $record;
    }
    writeStore($entity, $existing);
    respond(array('success' => true, 'message' => count($records) . ' record(s) imported into ' . $entity . '.'));
}

respond(array('success' => false, 'error' => 'Unsupported API action: ' . $action), 404);
