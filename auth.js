function checkAccessCode() {
    const accessCode = document.getElementById('accessCode').value;
    const errorElement = document.getElementById('error');
    
    // Pobierz aktualne klucze z localStorage lub pliku JSON
    fetch('data/keys.json')
        .then(response => response.json())
        .then(keys => {
            const currentTime = new Date().getTime();
            const validKey = keys.find(key => 
                key.code === accessCode && new Date(key.expires).getTime() > currentTime
            );
            
            if (validKey || accessCode === 'admin123') { // 'admin123' to domyślne hasło admina
                localStorage.setItem('authenticated', 'true');
                window.location.href = 'index.html';
            } else {
                errorElement.textContent = 'Nieprawidłowy lub przedawniony kod dostępu';
            }
        })
        .catch(error => {
            console.error('Błąd podczas wczytywania kluczy:', error);
            errorElement.textContent = 'Błąd systemu. Spróbuj ponownie później.';
        });
}

// Sprawdź czy użytkownik jest już uwierzytelniony
if (localStorage.getItem('authenticated') {
    window.location.href = 'index.html';
}
