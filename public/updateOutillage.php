<?php
//ces requetes permet d avoir si le serveur accepte d etablir une connexion
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit(0);
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
// connexion a la base de donnes
$host = 'localhost';
$dbname = 'outillages_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion BDD: ' . $e->getMessage()]);
    exit;
}

// Récupération des données JSON
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['NumeroSerie'])) {
    echo json_encode(['success' => false, 'message' => 'Le champ NumeroSerie est obligatoire']);
    exit;
}

$numeroSerie = $data['NumeroSerie'];
$etat = $data['Etat'] ?? null;
$emprunteur = $data['Emprunteur'] ?? null;
$lieu = $data['Lieu'] ?? null;
$ancienEmplacement = $data['AncienEmplacement'] ?? null;
$nouvelEmplacement = $data['NouvelEmplacement'] ?? null;

try {
    if ($etat !== null) {
        // Mise à jour complète avec Etat et autres champs (nécessite nouvelEmplacement)
        if ($nouvelEmplacement === null) {
            echo json_encode(['success' => false, 'message' => 'Le champ NouvelEmplacement est obligatoire pour mise à jour complète']);
            exit;
        }

        if ($ancienEmplacement !== null) {
            // Mise à jour ciblée par NumeroSerie + AncienEmplacement
            $stmt = $pdo->prepare("UPDATE outillage SET Etat = :etat, Emprunteur = :emprunteur, Lieu = :lieu, Emplacement = :nouvelEmplacement WHERE NumeroSerie = :numeroSerie AND Emplacement = :ancienEmplacement");
            $params = [
                ':etat' => $etat,
                ':emprunteur' => $etat === 'emprunte' ? $emprunteur : null,
                ':lieu' => $etat === 'emprunte' ? $lieu : null,
                ':nouvelEmplacement' => $nouvelEmplacement,
                ':numeroSerie' => $numeroSerie,
                ':ancienEmplacement' => $ancienEmplacement
            ];
        } else {
            // Mise à jour ciblée par NumeroSerie seul
            $stmt = $pdo->prepare("UPDATE outillage SET Etat = :etat, Emprunteur = :emprunteur, Lieu = :lieu, Emplacement = :nouvelEmplacement WHERE NumeroSerie = :numeroSerie");
            $params = [
                ':etat' => $etat,
                ':emprunteur' => $etat === 'emprunte' ? $emprunteur : null,
                ':lieu' => $etat === 'emprunte' ? $lieu : null,
                ':nouvelEmplacement' => $nouvelEmplacement,
                ':numeroSerie' => $numeroSerie
            ];
        }

        $stmt->execute($params);

    } elseif ($nouvelEmplacement !== null && $ancienEmplacement !== null) {
        // Mise à jour uniquement de l'emplacement avec NumeroSerie + AncienEmplacement
        $stmt = $pdo->prepare("UPDATE outillage SET Emplacement = :nouvelEmplacement WHERE NumeroSerie = :numeroSerie AND Emplacement = :ancienEmplacement");
        $stmt->execute([
            ':nouvelEmplacement' => $nouvelEmplacement,
            ':numeroSerie' => $numeroSerie,
            ':ancienEmplacement' => $ancienEmplacement
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Données insuffisantes pour mise à jour']);
        exit;
    }

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Mise à jour réussie']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Aucun changement ou outillage non trouvé']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur SQL : ' . $e->getMessage()]);
}
?>