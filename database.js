// Baza danych nicków i IP
const NICK_DATABASE = {
    "player1": "192.168.1.1",
    "player2": "192.168.1.2",
    "test": "127.0.0.1",
    "admin": "10.0.0.1"
};

// Funkcja do dodawania nowych nicków
function addNickToDatabase(nick, ip) {
    NICK_DATABASE[nick] = ip;
}

// Eksport dla Node.js (jeśli potrzebny)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NICK_DATABASE,
        addNickToDatabase
    };
}
