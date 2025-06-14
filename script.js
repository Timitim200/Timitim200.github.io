// Stałe
const ADMIN_PASSWORD = "admin123"; // Stałe hasło admina
const KEYS_FILE = "keys.json";

// Baza danych nicków i IP (przykładowe dane)
const NICK_DATABASE = {
    "player1": "192.168.1.1",
    "player2": "192.168.1.2",
    "test": "127.0.0.1",
    "admin": "10.0.0.1"
};

// Funkcje pomocnicze
function getCurrentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1);
}

function redirectToLogin() {
    window.location.href = "index.html";
}

function showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = isError ? "message error" : "message success";
    element.style.display = "block";
    
    setTimeout(() => {
        element.style.display = "none";
    }, 5000);
}

function generateRandomKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function formatDate(date) {
    return new Intl.DateTimeFormat('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}

function timeRemaining(expiryDate) {
    const now = new Date();
    const diff = expiryDate - now;
    
    if (diff <= 0) return "Wygasł";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
}

// Funkcje do zarządzania kluczami
async function loadKeys() {
    try {
        const response = await fetch(KEYS_FILE);
        if (!response.ok) throw new Error("Błąd ładowania kluczy");
        return await response.json();
    } catch (error) {
        console.error("Błąd ładowania kluczy:", error);
        return [];
    }
}

async function saveKeys(keys) {
    // W rzeczywistej aplikacji, to byłoby wysyłane do serwera
    // Tutaj symulujemy zapis do pliku JSON
    const jsonStr = JSON.stringify(keys, null, 2);
    
    // Zwracamy JSON do wklejenia ręcznego
    return jsonStr;
}

async function addNewKey(key, hoursValid) {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + hoursValid);
    
    const keys = await loadKeys();
    keys.push({
        key,
        expires: expiryDate.toISOString()
    });
    
    return await saveKeys(keys);
}

async function validateKey(key) {
    const keys = await loadKeys();
    const now = new Date();
    
    const validKey = keys.find(k => {
        return k.key === key && new Date(k.expires) > now;
    });
    
    return !!validKey;
}

async function getActiveKeys() {
    const keys = await loadKeys();
    const now = new Date();
    
    return keys.filter(k => new Date(k.expires) > now);
}

// Funkcje dla poszczególnych stron
function setupLoginPage() {
    const loginForm = document.getElementById("loginForm");
    const adminLoginForm = document.getElementById("adminLoginForm");
    const adminToggle = document.getElementById("adminToggle");
    const message = document.getElementById("message");
    
    adminToggle.addEventListener("click", (e) => {
        e.preventDefault();
        adminLoginForm.style.display = adminLoginForm.style.display === "none" ? "block" : "none";
    });
    
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const accessCode = document.getElementById("accessCode").value;
        
        if (await validateKey(accessCode)) {
            localStorage.setItem("accessKey", accessCode);
            window.location.href = "main.html";
        } else {
            showMessage("message", "Nieprawidłowy kod dostępu", true);
        }
    });
    
    adminLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const password = document.getElementById("adminPassword").value;
        
        if (password === ADMIN_PASSWORD) {
            localStorage.setItem("isAdmin", "true");
            window.location.href = "admin.html";
        } else {
            showMessage("message", "Nieprawidłowe hasło admina", true);
        }
    });
}

function setupMainPage() {
    const searchForm = document.getElementById("searchForm");
    const result = document.getElementById("result");
    const adminLink = document.getElementById("adminLink");
    const logoutLink = document.getElementById("logoutLink");
    
    // Sprawdź czy użytkownik jest zalogowany
    if (!localStorage.getItem("accessKey")) {
        redirectToLogin();
        return;
    }
    
    // Sprawdź czy użytkownik jest adminem
    if (localStorage.getItem("isAdmin") === "true") {
        adminLink.style.display = "inline";
    } else {
        adminLink.style.display = "none";
    }
    
    searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const nickname = document.getElementById("nickname").value.trim();
        
        if (NICK_DATABASE[nickname]) {
            result.innerHTML = `<p><strong>Nick:</strong> ${nickname}</p>
                               <p><strong>IP:</strong> ${NICK_DATABASE[nickname]}</p>`;
        } else {
            result.innerHTML = `<p>Nick "${nickname}" nie został znaleziony w bazie danych.</p>`;
        }
    });
    
    adminLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "admin.html";
    });
    
    logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("accessKey");
        localStorage.removeItem("isAdmin");
        redirectToLogin();
    });
}

async function setupAdminPage() {
    const keyGeneratorForm = document.getElementById("keyGeneratorForm");
    const generatedKeyDiv = document.getElementById("generatedKey");
    const copyKeyBtn = document.getElementById("copyKeyBtn");
    const jsonCodeContainer = document.getElementById("jsonCodeContainer");
    const jsonCodeTextarea = document.getElementById("jsonCode");
    const copyJsonBtn = document.getElementById("copyJsonBtn");
    const activeKeysList = document.getElementById("activeKeysList");
    const addNickForm = document.getElementById("addNickForm");
    const logoutLink = document.getElementById("logoutLink");
    
    // Sprawdź czy użytkownik jest adminem
    if (localStorage.getItem("isAdmin") !== "true") {
        redirectToLogin();
        return;
    }
    
    // Generowanie klucza
    keyGeneratorForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const hoursValid = parseInt(document.getElementById("keyDuration").value);
        const newKey = generateRandomKey();
        
        const jsonCode = await addNewKey(newKey, hoursValid);
        
        generatedKeyDiv.textContent = newKey;
        generatedKeyDiv.style.display = "block";
        copyKeyBtn.style.display = "inline";
        
        jsonCodeTextarea.value = jsonCode;
        jsonCodeContainer.style.display = "block";
        
        updateActiveKeysList();
    });
    
    // Kopiowanie klucza
    copyKeyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(generatedKeyDiv.textContent)
            .then(() => alert("Klucz skopiowany do schowka"))
            .catch(err => console.error("Błąd kopiowania:", err));
    });
    
    // Kopiowanie JSON
    copyJsonBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(jsonCodeTextarea.value)
            .then(() => alert("Kod JSON skopiowany do schowka"))
            .catch(err => console.error("Błąd kopiowania:", err));
    });
    
    // Dodawanie nowego nicku
    addNickForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newNick = document.getElementById("newNick").value.trim();
        const newIp = document.getElementById("newIp").value.trim();
        
        if (newNick && newIp) {
            NICK_DATABASE[newNick] = newIp;
            showMessage("addNickMessage", `Dodano nick "${newNick}" z IP ${newIp}`, false);
            addNickForm.reset();
        } else {
            showMessage("addNickMessage", "Wypełnij wszystkie pola", true);
        }
    });
    
    // Wylogowanie
    logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("accessKey");
        localStorage.removeItem("isAdmin");
        redirectToLogin();
    });
    
    // Funkcja aktualizująca listę aktywnych kluczy
    async function updateActiveKeysList() {
        const activeKeys = await getActiveKeys();
        activeKeysList.innerHTML = "";
        
        if (activeKeys.length === 0) {
            activeKeysList.innerHTML = "<tr><td colspan='3'>Brak aktywnych kluczy</td></tr>";
            return;
        }
        
        activeKeys.forEach(k => {
            const expiryDate = new Date(k.expires);
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td>${k.key}</td>
                <td>${formatDate(expiryDate)}</td>
                <td>${timeRemaining(expiryDate)}</td>
            `;
            
            activeKeysList.appendChild(row);
        });
    }
    
    // Inicjalizacja listy aktywnych kluczy
    updateActiveKeysList();
    
    // Automatyczna aktualizacja co minutę
    setInterval(updateActiveKeysList, 60000);
}

// Inicjalizacja odpowiedniej strony
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = getCurrentPage();
    
    switch (currentPage) {
        case "index.html":
        case "":
            setupLoginPage();
            break;
        case "main.html":
            setupMainPage();
            break;
        case "admin.html":
            setupAdminPage();
            break;
        default:
            redirectToLogin();
    }
});
