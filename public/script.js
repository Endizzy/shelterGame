// Инициализация подключения к серверу
const socket = io();

// Ссылки на элементы в DOM
const app = document.getElementById("app");
const playersContainer = document.getElementById("players-container");
const startButton = document.getElementById("start-game");
const joinButton = document.querySelector(".Game__button:nth-child(2)");
const sessionIdInput = document.getElementById("sessionField");
const showLobbyId = document.getElementById("session-id-display");

// Переменные для текущего игрока и сессии
let playerName = null;
let currentSessionId = null;


function showLoginForm() {
    document.getElementById('registration-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function showRegistrationForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('registration-form').style.display = 'block';
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

// Обработчик формы регистрации
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
            alert(data.message);
            regModal.style.display = 'none';
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
            loginModal.style.display = 'none';
            // Например, сохранить токен
            localStorage.setItem('authToken', data.token);
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
startButton.addEventListener("click", () => {
    playerName = prompt("Enter your name:");
    if (!playerName) {
        alert("Name is required to create a game.");
        return;
    }

    socket.emit("createGame", playerName); // Отправляем запрос на создание игры
});

// Событие для подключения к игре
joinButton.addEventListener("click", () => {
    const sessionId = sessionIdInput.value.trim(); // Получаем введенный ID сессии
    playerName = prompt("Enter your name:");

    if (sessionId && playerName) {
        socket.emit("joinGame", { sessionId, playerName }); // Отправляем запрос на подключение
    } else {
        alert("Please enter a valid session ID and your name.");
    }
    showLobbyId.textContent = `Game ID: ${sessionId}`;
});

// Слушатель: подтверждение создания игры
socket.on("gameCreated", ({ sessionId }) => {
    currentSessionId = sessionId; // Обновляем текущую сессию
    alert(`Game created successfully! Session ID: ${sessionId}`);
    renderPlayers([{ id: socket.id, name: playerName }]); // Отображаем создателя в лобби
    showLobbyId.textContent = `Game ID: ${sessionId}`;
});

// Слушатель: обновление списка игроков
socket.on("updatePlayers", (players) => {
    renderPlayers(players);
});

// Слушатель: ошибка
socket.on("error", (message) => {
    alert(message);
});

// Функция для отображения игроков
function renderPlayers(players) {
    playersContainer.innerHTML = ""; // Очищаем контейнер перед повторным рендерингом

    players.forEach((player) => {
        const playerCard = document.createElement("div");
        playerCard.classList.add("card");
        playerCard.innerHTML = `
            <h2>${player.name}</h2>
            <p>ID: ${player.id}</p>
        `;
        playersContainer.appendChild(playerCard); // Добавляем карточку игрока в контейнер
    });
}
