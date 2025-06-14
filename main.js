// Sprawdź autoryzację
if (!localStorage.getItem('authenticated')) {
    window.location.href = 'auth.html';
}

function searchIP() {
    const nickname = document.getElementById('nickname').value;
    const resultElement = document.getElementById('result');
    
    if (!nickname) {
        resultElement.textContent = 'Proszę wprowadzić nick!';
        return;
    }
    
    // Wyszukaj w bazie danych
    fetch('data/database.json')
        .then(response => response.json())
        .then(database => {
            if (database[nickname]) {
                resultElement.textContent = `IP dla nicku "${nickname}": ${database[nickname]}`;
            } else {
                resultElement.textContent = `Nie znaleziono IP dla nicku "${nickname}"`;
            }
        })
        .catch(error => {
            console.error('Błąd podczas wyszukiwania IP:', error);
            resultElement.textContent = 'Wystąpił błąd podczas wyszukiwania. Spróbuj ponownie później.';
        });
}
