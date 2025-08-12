<?php
// En-têtes CORS : autorise les requêtes depuis n’importe quelle origine
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

header('Content-Type: application/json');

try {
    $pdo = new PDO('mysql:host=localhost;dbname=outillages_db', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $code = isset($_GET['code']) ? $_GET['code'] : '';
    if ($code) {
        $stmt = $pdo->prepare('SELECT * FROM outillage WHERE Code = :code');
        $stmt->execute(['code' => $code]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $stmt = $pdo->query('SELECT * FROM outillage');
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    echo json_encode($data);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}

