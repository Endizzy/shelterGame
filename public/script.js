// Инициализация подключения к серверу
const socket = io();

// Ссылки на элементы в DOM
const app = document.getElementById("app");
const playersContainer = document.getElementById("players-container");
const startButton = document.getElementById("start-game");
const joinButton = document.querySelector(".Game__button:nth-child(2)");
const sessionIdInput = document.getElementById("sessionField");
const showLobbyId = document.getElementById("session-id-display");
const logoutButton = document.getElementById('logout');

// Переменные для текущего игрока и сессии
let playerName = null;
let currentSessionId = null;
let currentPlayers = []; // Список текущих игроков

let adminId = null; // ID текущего администратора

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    const userTextDiv = document.getElementById('text__user');
    const userNameLink = document.getElementById('user__name');
    const loginLink = document.getElementById('openLogin');
    const logoutLink = document.getElementById('text__logout');

    if (token) {
        try {
            const response = await fetch('/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                userNameLink.textContent = `${data.username}`;
                loginLink.style.display = 'none';
                logoutLink.style.display = 'block';
                userTextDiv.style.display = 'block';
            } else {
                console.error('Token verification failed');
                localStorage.removeItem('authToken');
                resetNavToDefault();
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            resetNavToDefault();
        }
    } else {
        resetNavToDefault();
    }
});

logoutButton.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    resetNavToDefault();
    location.reload()
});

// Функция для сброса навигации к дефолтному состоянию
function resetNavToDefault() {
    const loginLink = document.getElementById('openLogin');
    const logoutLink = document.getElementById('text__logout');
    const userTextDiv = document.getElementById('text__user');
    loginLink.style.display = 'block';
    logoutLink.style.display = 'none';
    userTextDiv.style.display = 'none';
}

// Функция для обновления меню после успешного логина
function updateNavForLoggedInUser(username) {
    const userNameLink = document.getElementById('user__name');
    const loginLink = document.getElementById('openLogin');
    const logoutLink = document.getElementById('text__logout');
    const userTextDiv = document.getElementById('text__user');

    userNameLink.textContent = `${username}`;
    loginLink.style.display = 'none'; // Скрываем Login
    logoutLink.style.display = 'block'; // Показываем Logout
    userTextDiv.style.display = 'block'; // Показываем имя пользователя
}

function showLoginForm() {
    document.getElementById('registration-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function showRegistrationForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('registration-form').style.display = 'block';
    loginInputs.forEach(input => {
        input.value = ""; // Сбрасываем значение
    });
}

const loginModal = document.getElementById('login-form');
const regModal = document.getElementById('registration-form');
const closeLoginButton = document.querySelector('.close');
const closeRegButton = document.querySelector('.reg__close');
const loginInputs = loginModal.querySelectorAll("input");
const regInputs = regModal.querySelectorAll("input");
// Закрытие модального окна при нажатии на крестик
closeLoginButton.addEventListener('click', function () {
    loginModal.style.display = 'none';
    document.body.classList.remove("no-scroll");
    loginInputs.forEach(input => {
        input.value = ""; // Сбрасываем значение
    });
});

// Закрытие окна регистрации
closeRegButton.addEventListener('click', function () {
    regModal.style.display = 'none';
    document.body.classList.remove("no-scroll");
    regInputs.forEach(input => {
        input.value = ""; // Сбрасываем значение
    });
});

// Закрытие модальных окон при клике за их пределами
window.addEventListener('click', function (event) {
    if (event.target === loginModal) {
        loginModal.style.display = 'none';
        document.body.classList.remove("no-scroll");
        loginInputs.forEach(input => {
            input.value = ""; // Сбрасываем значение
        });
    }
    if (event.target === regModal) {
        regModal.style.display = 'none';
        document.body.classList.remove("no-scroll");
        regInputs.forEach(input => {
            input.value = ""; // Сбрасываем значение
        });
    }
});

// Отработка регистрации и авторизации в модальном окне
const registrationForm = document.getElementById('regForm');
const loginForm = document.getElementById('loginForm');
const messageBox = document.getElementById('messageBox');

//Обработчик формы регистрации
registrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    try {
        const response = await fetch('/auth/registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
            alert("Успешная регистрация!");
            regModal.style.display = 'none';
            location.reload();
        } else {
            messageBox.textContent = data.message || 'Registration failed';
        }
    } catch (error) {
        messageBox.textContent = 'An error occurred during registration';
    }
});

// Обработчик формы авторизации
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
            alert('Login successful!');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('username', username);
            updateNavForLoggedInUser(username);
            loginModal.style.display = 'none';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        alert('An error occurred during login');
    }
});

// Очистка форм при закрытии
closeLoginButton.addEventListener('click', () => {
    loginInputs.forEach(input => input.value = '');
});
closeRegButton.addEventListener('click', () => {
    regInputs.forEach(input => input.value = '');
});


// Событие для создания игры
startButton.addEventListener("click", async() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Вы должны быть авторизованы для создания игры");
        return;
    }
    if (token) {
        try {
            const response = await fetch('/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                playerName = data.username;
                socket.emit("createGame", playerName);
            } else {
                console.error('Token verification failed');
                localStorage.removeItem('authToken');
            }
        } catch (error) {
            console.error('Error verifying token:', error);
        }
    }
});



// Событие для подключения к игре
joinButton.addEventListener("click", async() => {
    const sessionId = sessionIdInput.value.trim(); // Получаем введенный ID сессии
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert("Вы должны быть авторизованы");
        return;
    }
    if (token) {
        try {
            const response = await fetch('/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                playerName = data.username;
            } else {
                console.error('Token verification failed');
                localStorage.removeItem('authToken');
            }
        } catch (error) {
            console.error('Error verifying token:', error);
        }
        if (sessionId && playerName) {
            socket.emit("joinGame", { sessionId, playerName }); // Отправляем запрос на подключение
        } else {
            alert("Please enter a valid session ID and your name.");
        }
        showLobbyId.textContent = `Game ID: ${sessionId}`;
    }
});

// Слушатель: подтверждение создания игры
socket.on("gameCreated", ({ sessionId }) => {
    currentSessionId = sessionId; // Обновляем текущую сессию
    alert(`Game created successfully! Session ID: ${sessionId}`);
    renderPlayers([{ id: socket.id, name: playerName, isAdmin: true }]); // Отображаем создателя в лобби
    showLobbyId.textContent = `Game ID: ${sessionId}`;
    adminId = socket.id; // Создатель становится администратором
});

// Слушатель: обновление списка игроков
socket.on("updatePlayers", (players) => {
    currentPlayers = players; // Обновляем список игроков
    renderPlayers(players);   // Перерисовываем игроков в интерфейсе
});

// Слушатель: ошибка
socket.on("error", (message) => {
    alert(message);
});

// Функция для отображения игроков
function renderPlayers(players) {
    console.log("Rendering players:", players); // Лог текущего списка игроков
    playersContainer.innerHTML = ""; // Очищаем контейнер перед повторным рендерингом

    players.forEach((player) => {
        console.log("Processing player:", player); // Лог игрока, который обрабатывается

        const playerCard = document.createElement("div");
        playerCard.classList.add("card");
        playerCard.innerHTML = `
            <h2>${player.name}</h2>
            <p>ID: ${player.id || "N/A"}</p>
            ${player.isAdmin ? '<a>Admin</a>' : ''}
            ${
                adminId === socket.id && player.id !== socket.id
                    ? `<button class="button__lobby-kick" data-id="${player.id}">Kick</button>
                       <button class="button__lobby-admin" data-id="${player.id}">Admin</button>`
                    : ""
            }
        `;
        playersContainer.appendChild(playerCard);
    });

    // Обработчики кнопок
    document.querySelectorAll(".button__lobby-kick").forEach(button => {
        button.addEventListener("click", () => {
            const playerId = button.getAttribute("data-id");
            socket.emit("kickPlayer", playerId);
        });
    });

    document.querySelectorAll(".button__lobby-admin").forEach(button => {
        button.addEventListener("click", () => {
            const playerId = button.getAttribute("data-id");
            socket.emit("transferAdmin", playerId);
        });
    });
}

socket.on("kicked", () => {
    alert("You have been kicked from the session.");
    currentSessionId = null; // Сброс текущей сессии
    currentPlayers = []; // Очистка списка игроков
    showLobbyId.textContent = ""; // Сброс отображения ID лобби
    playersContainer.innerHTML = ""; // Очистка игроков из интерфейса
});


// Обновление администратора
socket.on("updateAdmin", (newAdminId) => {
    adminId = newAdminId;
    renderPlayers(currentPlayers); // currentPlayers должен содержать актуальный список игроков
});
