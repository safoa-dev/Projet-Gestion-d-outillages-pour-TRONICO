<?php
//etablir la connexion pour le partage des ressources
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
  http_response_code(200);
  exit();
}
header('Content-Type: application/json');
//Connexion a la base de donne
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
// recuperation et validation des donnes envoyes
$data = json_decode(file_get_contents('php://input'), true);
$requiredFields = ['Code', 'Emplacement', 'Etat', 'NumeroSerie'];
foreach ($requiredFields as $field) {
    if (empty($data[$field])) {
        echo json_encode(['success' => false, 'error' => "Le champ $field est obligatoire"]);
        exit;
    }
}
//stocke les donnes recuperer dans des variables
$Code = $data['Code'];
$Emplacement = $data['Emplacement'];
$Etat = $data['Etat'];
$Emprunteur = isset($data['Emprunteur']) ? $data['Emprunteur'] : '';
$Lieu = isset($data['Lieu']) ? $data['Lieu'] : '';
$NumeroSerie = $data['NumeroSerie'];
//insertion dans  la base de donnees 
try {
    // Vérifier si un outillage avec ce NumeroSerie existe déjà
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM outillage WHERE NumeroSerie = ?");
    $stmt->execute([$NumeroSerie]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(['success' => false, 'error' => 'Outillage avec ce NumeroSerie existe déjà']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO outillage (Code, Emplacement, Etat, Emprunteur, Lieu, NumeroSerie) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$Code, $Emplacement, $Etat, $Emprunteur, $Lieu, $NumeroSerie]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Erreur SQL : ' . $e->getMessage()]);
}


