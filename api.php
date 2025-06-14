<?php
// api.php - Główny plik API do obsługi bazy danych
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Konfiguracja bazy danych
class Database {
    private $host = "localhost";
    private $username = "your_username";
    private $password = "your_password";
    private $database = "nick_system";
    private $conn;

    public function __construct() {
        try {
            $this->conn = new PDO(
                "mysql:host={$this->host};dbname={$this->database};charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
        } catch(PDOException $e) {
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }

    public function getConnection() {
        return $this->conn;
    }
}

// Klasa do zarządzania kluczami
class KeyManager {
    private $db;

    public function __construct() {
        $this->db = (new Database())->getConnection();
    }

    // Generowanie nowego klucza
    public function generateKey($expiryHours, $adminId) {
        try {
            $code = $this->generateRandomCode();
            $expiryDate = date('Y-m-d H:i:s', strtotime("+{$expiryHours} hours"));
            
            $stmt = $this->db->prepare("
                INSERT INTO access_keys (code, created_at, expires_at, created_by, is_active) 
                VALUES (?, NOW(), ?, ?, 1)
            ");
            
            $stmt->execute([$code, $expiryDate, $adminId]);
            
            return [
                'success' => true,
                'code' => $code,
                'expires_at' => $expiryDate,
                'id' => $this->db->lastInsertId()
            ];
        } catch(Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // Sprawdzanie czy klucz jest aktywny
    public function validateKey($code) {
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM access_keys 
                WHERE code = ? AND is_active = 1 AND expires_at > NOW()
            ");
            $stmt->execute([$code]);
            $key = $stmt->fetch();
            
            if ($key) {
                // Aktualizacja ostatniego użycia
                $updateStmt = $this->db->prepare("
                    UPDATE access_keys SET last_used = NOW() WHERE id = ?
                ");
                $updateStmt->execute([$key['id']]);
                
                return ['valid' => true, 'key' => $key];
            }
            
            return ['valid' => false];
        } catch(Exception $e) {
            return ['valid' => false, 'error' => $e->getMessage()];
        }
    }

    // Pobieranie wszystkich kluczy
    public function getAllKeys() {
        try {
            $stmt = $this->db->prepare("
                SELECT *, 
                    CASE WHEN expires_at > NOW() AND is_active = 1 THEN 'active' 
                         ELSE 'expired' END as status,
                    TIMESTAMPDIFF(HOUR, NOW(), expires_at) as hours_remaining
                FROM access_keys 
                ORDER BY created_at DESC
            ");
            $stmt->execute();
            return ['success' => true, 'keys' => $stmt->fetchAll()];
        } catch(Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // Usuwanie klucza
    public function deleteKey($keyId) {
        try {
            $stmt = $this->db->prepare("DELETE FROM access_keys WHERE id = ?");
            $stmt->execute([$keyId]);
            return ['success' => true];
        } catch(Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function generateRandomCode() {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return substr(str_shuffle(str_repeat($chars, 2)), 0, 8);
    }
}

// Klasa do zarządzania nickami
class NickManager {
    private $db;

    public function __construct() {
        $this->db = (new Database())->getConnection();
    }

    // Wyszukiwanie IP dla nicku
    public function findIP($nick) {
        try {
            $stmt = $this->db->prepare("
                SELECT ip_address FROM nick_database 
                WHERE nick = ? AND is_active = 1
            ");
            $stmt->execute([$nick]);
            $result = $stmt->fetch();
            
            if ($result) {
                // Logowanie wyszukiwania
                $this->logSearch($nick, $result['ip_address'], true);
                return ['found' => true, 'ip' => $result['ip_address']];
            }
            
            $this->logSearch($nick, null, false);
            return ['found' => false];
        } catch(Exception $e) {
            return ['found' => false, 'error' => $e->getMessage()];
        }
    }

    // Dodawanie nowego nicku
    public function addNick($nick, $ip, $adminId) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO nick_database (nick, ip_address, created_by, created_at, is_active) 
                VALUES (?, ?, ?, NOW(), 1)
                ON DUPLICATE KEY UPDATE 
                ip_address = VALUES(ip_address), 
                updated_at = NOW()
            ");
            $stmt->execute([$nick, $ip, $adminId]);
            return ['success' => true];
        } catch(Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // Pobieranie wszystkich nicków
    public function getAllNicks() {
        try {
            $stmt = $this->db->prepare("
                SELECT * FROM nick_database 
                WHERE is_active = 1 
                ORDER BY nick ASC
            ");
            $stmt->execute();
            return ['success' => true, 'nicks' => $stmt->fetchAll()];
        } catch(Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // Usuwanie nicku
    public function deleteNick($nickId) {
        try {
            $stmt = $this->db->prepare("
                UPDATE nick_database SET is_active = 0 WHERE id = ?
            ");
            $stmt->execute([$nickId]);
            return ['success' => true];
        } catch(Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function logSearch($nick, $ip, $found) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO search_logs (nick, ip_found, found, searched_at) 
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([$nick, $ip, $found ? 1 : 0]);
        } catch(Exception $e) {
            // Log error but don't fail the main operation
            error_log("Failed to log search: " . $e->getMessage());
        }
    }
}

// Router API
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_REQUEST['path'] ?? '', PHP_URL_PATH);
$data = json_decode(file_get_contents('php://input'), true) ?? [];

// Stałe autoryzacji
const ADMIN_PASSWORD = "admin123";
const MASTER_AUTH_CODE = "MASTER2025";

switch($path) {
    case '/auth':
        handleAuth($data);
        break;
    case '/search':
        handleSearch($data);
        break;
    case '/keys':
        handleKeys($method, $data);
        break;
    case '/nicks':
        handleNicks($method, $data);
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
}

// Funkcje obsługi API
function handleAuth($data) {
    $code = $data['code'] ?? '';
    
    if ($code === ADMIN_PASSWORD) {
        echo json_encode(['success' => true, 'role' => 'admin']);
    } elseif ($code === MASTER_AUTH_CODE) {
        echo json_encode(['success' => true, 'role' => 'user']);
    } else {
        $keyManager = new KeyManager();
        $result = $keyManager->validateKey($code);
        
        if ($result['valid']) {
            echo json_encode(['success' => true, 'role' => 'user']);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Invalid code']);
        }
    }
}

function handleSearch($data) {
    $nick = $data['nick'] ?? '';
    
    if (empty($nick)) {
        http_response_code(400);
        echo json_encode(['error' => 'Nick is required']);
        return;
    }
    
    $nickManager = new NickManager();
    $result = $nickManager->findIP($nick);
    echo json_encode($result);
}

function handleKeys($method, $data) {
    $keyManager = new KeyManager();
    
    switch($method) {
        case 'GET':
            echo json_encode($keyManager->getAllKeys());
            break;
        case 'POST':
            $result = $keyManager->generateKey(
                $data['expiry'] ?? 24, 
                $data['admin_id'] ?? 1
            );
            echo json_encode($result);
            break;
        case 'DELETE':
            $result = $keyManager->deleteKey($data['id'] ?? 0);
            echo json_encode($result);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
}

function handleNicks($method, $data) {
    $nickManager = new NickManager();
    
    switch($method) {
        case 'GET':
            echo json_encode($nickManager->getAllNicks());
            break;
        case 'POST':
            $result = $nickManager->addNick(
                $data['nick'] ?? '', 
                $data['ip'] ?? '', 
                $data['admin_id'] ?? 1
            );
            echo json_encode($result);
            break;
        case 'DELETE':
            $result = $nickManager->deleteNick($data['id'] ?? 0);
            echo json_encode($result);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
}
?>
