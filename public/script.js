// Инициализация подключения к серверу
const socket = io();

// Ссылки на элементы в DOM
const app = document.getElementById("app");
const playersContainer = document.getElementById("players-container");
const startButton = document.getElementById("start-game");
const joinButton = document.querySelector(".Game__button:nth-child(2)");
const sessionIdInput = document.createElement("input");
sessionIdInput.placeholder = "Enter Session ID";
sessionIdInput.className = "session-input";
sessionIdInput.style.display = "none";

// Добавляем поле ввода для ID сессии под кнопкой "Join Game"
joinButton.insertAdjacentElement("afterend", sessionIdInput);

// Событие для создания игры
startButton.addEventListener("click", () => {
    socket.emit("createGame"); // Отправляем запрос на создание игры
});

// Событие для подключения к игре
joinButton.addEventListener("click", () => {
    const sessionId = sessionIdInput.value.trim(); // Получаем введенный ID сессии
    const playerName = prompt("Enter your name:");

    if (sessionId && playerName) {
        socket.emit("joinGame", { sessionId, playerName }); // Отправляем запрос на подключение
    } else {
        alert("Please enter a valid session ID and your name.");
    }
});

// Слушатель: подтверждение создания игры
socket.on("gameCreated", ({ sessionId }) => {
    alert(`Game created successfully! Session ID: ${sessionId}`);
    sessionIdInput.style.display = "block"; // Показываем поле ввода для подключения
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
