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

// Validation des données
if (empty($data['NumeroSerie'])) {
    echo json_encode(['success' => false, 'error' => 'NumeroSerie manquant']);
    exit;
}
if (!isset($data['Emplacement']) || $data['Emplacement'] === '') {
    echo json_encode(['success' => false, 'error' => 'Emplacement manquant ou vide']);
    exit;
}

$numeroSerie = $data['NumeroSerie'];
$newEmplacement = $data['Emplacement'];

try {
    $stmt = $pdo->prepare("UPDATE outillage SET Emplacement = ? WHERE NumeroSerie = ?");
    $stmt->execute([$newEmplacement, $numeroSerie]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        // rowCount = 0 peut vouloir dire que le numeroSerie n'existe pas, ou que l'emplacement est identique à la valeur actuelle
        echo json_encode(['success' => false, 'error' => 'Outillage non trouvé ou emplacement inchangé']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur SQL : ' . $e->getMessage()]);
}
