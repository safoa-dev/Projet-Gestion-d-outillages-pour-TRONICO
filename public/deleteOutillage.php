<?php
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  http_response_code(200);
  exit();
}
header('Content-Type: application/json');

$host = 'localhost';
$db = 'outillages_db';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Connexion échouée : ' . $e->getMessage()]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['NumeroSerie'])) {
    echo json_encode(['success' => false, 'error' => 'NumeroSerie manquant']);
    exit;
}
if (empty($data['Emplacement'])) {
    echo json_encode(['success' => false, 'error' => 'Emplacement manquant']);
    exit;
}

$numeroSerie = $data['NumeroSerie'];
$emplacement = $data['Emplacement'];

try {
    $stmt = $pdo->prepare("DELETE FROM outillage WHERE NumeroSerie = ? AND Emplacement = ?");
    $stmt->execute([$numeroSerie, $emplacement]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Outillage non trouvé']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur SQL : ' . $e->getMessage()]);
}
