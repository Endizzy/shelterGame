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

// async function submitRegistrationForm(){
//     const username = document.getElementById('regUsername').value;
//     const password = document.getElementById('regPassword').value;
//
//     try {
//         const response = await fetch('/auth/registration', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ username, password }),
//         });
//         const data = await response.json();
//         if (response.ok) {
//             alert(data.message);
//             // regModal.style.display = 'none';
//         } else {
//             messageBox.textContent = data.message || 'Registration failed';
//         }
//     } catch (error) {
//         messageBox.textContent = 'An error occurred during registration';
//     }
// }


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
            <button class="button__lobby-kick" id="buttonKick">Kick</button>
            <button class="button__lobby-admin" id="buttonAdmin">Admin</button>
        `;
        playersContainer.appendChild(playerCard); // Добавляем карточку игрока в контейнер
    });
}
