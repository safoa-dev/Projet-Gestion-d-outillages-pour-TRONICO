<?php 
// En-têtes CORS plus permissifs
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false, 
        'message' => 'Méthode non autorisée. Méthode reçue: ' . $_SERVER['REQUEST_METHOD']
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode([
        'success' => false, 
        'message' => 'Données JSON invalides'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

error_log('updateEtat.php - Données reçues: ' . print_r($input, true));

$required_fields = ['Code', 'Etat'];
foreach ($required_fields as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => "Le champ $field est obligatoire"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

try {
    $pdo = new PDO('mysql:host=localhost;dbname=outillages_db;charset=utf8', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $code = $input['Code'];
    $etat = $input['Etat'];
    $emprunteur = isset($input['Emprunteur']) ? $input['Emprunteur'] : '';
    $lieu = isset($input['Lieu']) ? $input['Lieu'] : '';
    
  
    if (isset($input['Emplacement']) && !empty($input['Emplacement'])) {
        $emplacement = $input['Emplacement'];
        $sql = "UPDATE outillage SET Etat = :etat, Emprunteur = :emprunteur, Lieu = :lieu 
                WHERE Code = :code AND Emplacement = :emplacement";
                
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            ':etat' => $etat,
            ':emprunteur' => $emprunteur,
            ':lieu' => $lieu,
            ':code' => $code,
            ':emplacement' => $emplacement
        ]);
        
        error_log("SQL exécuté avec emplacement: $sql");
        error_log("Paramètres: " . print_r([
            ':etat' => $etat,
            ':emprunteur' => $emprunteur,
            ':lieu' => $lieu,
            ':code' => $code,
            ':emplacement' => $emplacement
        ], true));
    } else {
        $sql = "UPDATE outillage SET Etat = :etat, Emprunteur = :emprunteur, Lieu = :lieu 
                WHERE Code = :code";
                
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            ':etat' => $etat,
            ':emprunteur' => $emprunteur,
            ':lieu' => $lieu,
            ':code' => $code
        ]);
        
        error_log("SQL exécuté sans emplacement: $sql");
    }
    
    if ($result && $stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true, 
            'message' => 'État mis à jour avec succès',
            'rows_affected' => $stmt->rowCount()
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'Aucune ligne mise à jour. Vérifiez le code et l\'emplacement.'
        ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (PDOException $e) {
    error_log('Erreur PDO dans updateEtat.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erreur base de données: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log('Erreur générale dans updateEtat.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Erreur serveur: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>