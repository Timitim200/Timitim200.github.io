// Sprawdź autoryzację admina
function checkAdminAuth() {
    const adminPassword = localStorage.getItem('adminPassword') || 'admin123'; // Domyślne hasło
    
    const enteredPassword = prompt('Wpisz hasło administratora:');
    if (enteredPassword !== adminPassword) {
        alert('Nieprawidłowe hasło administratora!');
        window.location.href = 'auth.html';
    }
}

// Wywołaj sprawdzenie autoryzacji przy załadowaniu strony
checkAdminAuth();

function generateKey() {
    const validityHours = parseInt(document.getElementById('validity').value);
    const now = new Date();
    const expirationDate = new Date(now.getTime() + validityHours * 60 * 60 * 1000);
    
    // Generuj losowy klucz
    const key = 'key-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Pobierz istniejące klucze
    fetch('data/keys.json')
        .then(response => response.json())
        .then(keys => {
            // Dodaj nowy klucz
            keys.push({
                code: key,
                generated: now.toISOString(),
                expires: expirationDate.toISOString()
            });
            
            // Zapisz zaktualizowaną listę kluczy
            return fetch('data/keys.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(keys)
            });
        })
        .then(() => {
            document.getElementById('generatedKey').textContent = `Wygenerowany klucz: ${key}`;
            loadActiveKeys();
        })
        .catch(error => {
            console.error('Błąd podczas generowania klucza:', error);
            alert('Wystąpił błąd podczas generowania klucza.');
        });
}

function loadActiveKeys() {
    fetch('data/keys.json')
        .then(response => response.json())
        .then(keys => {
            const currentTime = new Date().getTime();
            const activeKeys = keys.filter(key => new Date(key.expires).getTime() > currentTime);
            
            const tableBody = document.querySelector('#activeKeys tbody');
            tableBody.innerHTML = '';
            
            activeKeys.forEach(key => {
                const row = document.createElement('tr');
                
                const codeCell = document.createElement('td');
                codeCell.textContent = key.code;
                
                const expiresCell = document.createElement('td');
                expiresCell.textContent = new Date(key.expires).toLocaleString();
                
                row.appendChild(codeCell);
                row.appendChild(expiresCell);
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Błąd podczas ładowania kluczy:', error);
        });
}

function addNickIP() {
    const nick = document.getElementById('newNick').value;
    const ip = document.getElementById('newIP').value;
    
    if (!nick || !ip) {
        alert('Proszę wypełnić oba pola!');
        return;
    }
    
    // Pobierz istniejącą bazę danych
    fetch('data/database.json')
        .then(response => response.json())
        .then(database => {
            // Dodaj nowy wpis
            database[nick] = ip;
            
            // Zapisz zaktualizowaną bazę danych
            return fetch('data/database.json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(database)
            });
        })
        .then(() => {
            alert('Pomyślnie dodano nick i IP!');
            document.getElementById('newNick').value = '';
            document.getElementById('newIP').value = '';
        })
        .catch(error => {
            console.error('Błąd podczas dodawania nicku i IP:', error);
            alert('Wystąpił błąd podczas dodawania danych.');
        });
}

function changeAdminPassword() {
    const newPassword = document.getElementById('adminPassword').value;
    
    if (!newPassword) {
        alert('Proszę wprowadzić nowe hasło!');
        return;
    }
    
    localStorage.setItem('adminPassword', newPassword);
    alert('Hasło administratora zostało zmienione!');
    document.getElementById('adminPassword').value = '';
}

// Załaduj aktywne klucze przy otwarciu strony
document.addEventListener('DOMContentLoaded', loadActiveKeys);
