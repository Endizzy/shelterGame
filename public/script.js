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
