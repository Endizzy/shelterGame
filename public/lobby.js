// Инициализация подключения к серверу
const socket = io();

// Проверка подключения WebSocket
socket.on("connect", () => {
    console.log("✅ WebSocket подключён. ID сокета:", socket.id);
});

socket.on("disconnect", () => {
    console.warn("⚠️ WebSocket отключён.");
});

const maxPlayerCount = 8;

// Ссылки на DOM элементы
const playersContainer = document.getElementById("players-container");
const showLobbyId = document.getElementById("session-id-display");
let showPlayersCount = document.getElementById("playersCount");

// Данные сессии
let playerName = localStorage.getItem("username");
let currentSessionId = localStorage.getItem("sessionId");
let isAdmin = localStorage.getItem("isAdmin") === "true"; // Преобразуем в Boolean
const savedLobbyName = localStorage.getItem("lobbyName");
let adminId = null;
let currentPlayers = [];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    const userTextDiv = document.getElementById('text__user');
    const userNameLink = document.getElementById('user__name');
    const loginLink = document.getElementById('openLogin');
    const logoutLink = document.getElementById('text__logout');
    const showLobbyName = document.getElementById('lobbyName');

    if (!token || !localStorage.getItem('sessionId') || !localStorage.getItem('username')) {
        alert("Ошибка: Необходима авторизация и активная сессия.");
        window.location.href = "/"; // Перенос на главную страницу
        return;
    }

    // Проверка токена пользователя
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
            console.log(localStorage);
            loginLink.style.display = 'none';
            logoutLink.style.display = 'block';
            userTextDiv.style.display = 'block';
            showLobbyName.textContent = `${savedLobbyName}`;
            console.log(savedLobbyName);
        } else {
            console.error('Ошибка верификации токена');
            localStorage.clear();
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error('Ошибка при верификации токена:', error);
        localStorage.clear();
        window.location.href = "index.html";
    }

    // Отображение ID сессии
    const currentSessionId = localStorage.getItem('sessionId');
    const playerName = localStorage.getItem('username');
    const showLobbyId = document.getElementById('session-id-display');
    showLobbyId.textContent = `Game ID: ${currentSessionId}`;

    // 🔥 Проверяем, есть ли старый socket.id (переподключение)
    const oldSocketId = localStorage.getItem("oldSocketId");
    if (oldSocketId) {
        console.log(`🔄 Переподключение, старый ID: ${oldSocketId}, новый ID: ${socket.id}`);
        socket.emit("reconnectPlayer", { sessionId: currentSessionId, playerName, oldSocketId });
    } else {
        console.log(`📤 Отправка запроса на подключение к игре: ${currentSessionId}`);
        socket.emit("joinGame", { sessionId: currentSessionId, playerName });
    }
});

function copyToClipboard() {
    const currentSessionId = localStorage.getItem('sessionId');
    navigator.clipboard.writeText(currentSessionId).then(() => {
        console.log("Текст успешно скопирован!");
    }).catch(err => {
        console.error("Ошибка при копировании: ", err);
    });
}


function updatePlayerCount(count) {
    const counter = document.getElementById("playersCount");
    counter.textContent = count + " / " + maxPlayerCount;

    // Добавляем анимацию
    const counterWrapper = document.querySelector(".players__count");
    counterWrapper.classList.add("updated");

    // Убираем анимацию после 500 мс
    setTimeout(() => {
        counterWrapper.classList.remove("updated");
    }, 500);
}


// // Слушатель: обновление списка игроков
// socket.on("updatePlayers", (players) => { NEWNEW
//     console.log("📥 Обновление списка игроков:", players);
//     currentPlayers = players;
//     renderPlayers(players);
//
//     // Удаляем `oldSocketId`, если игрок успешно переподключился
//     // if (players.some(p => p.id === socket.id)) {
//     //     localStorage.removeItem("oldSocketId");
//     // }
//     localStorage.removeItem("oldSocketId");
//     updatePlayerCount(players.length); // Счетчик игроков в лобби
// });

socket.on("updateLobbyName", (lobbyName) => {
    console.log(`📢 Обновление названия лобби: ${lobbyName}`);
    localStorage.setItem("lobbyName", lobbyName); // Сохраняем в локальном хранилище
    document.getElementById("lobbyName").textContent = `${lobbyName}`;
});

socket.on("updatePlayers", (players) => {
    console.log("📥 Обновление списка игроков:", players);
    currentPlayers = players;

    // Проверяем, кто сейчас админ
    isAdmin = adminId === socket.id;
    localStorage.setItem("isAdmin", isAdmin);

    // Ререндер интерфейса
    renderPlayers(players);

    // Удаляем `oldSocketId`, если успешно переподключились
    localStorage.removeItem("oldSocketId");
    updatePlayerCount(players.length);
});



// // Слушатель: обновление администратора NEWNEW
// socket.on("updateAdmin", (newAdminId) => {
//     console.log(`👑 Новый админ: ${newAdminId}`);
//     adminId = newAdminId;
//     isAdmin = adminId === socket.id; // Обновляем статус администратора
//     renderPlayers(currentPlayers);
// });
socket.on("updateAdmin", (newAdminId) => {
    console.log(`👑 Новый админ: ${newAdminId}`);
    adminId = newAdminId;
    isAdmin = adminId === socket.id; // Перезаписываем isAdmin

    // Сохраняем изменения в localStorage
    localStorage.setItem("isAdmin", isAdmin);

    // Перерисовываем интерфейс
    renderPlayers(currentPlayers);
});


// Слушатель: исключение игрока
socket.on("kicked", () => {
    console.warn("❌ Вас исключили из лобби.");
    alert("Вы были исключены из лобби.");
    localStorage.removeItem("sessionId");
    window.location.href = "index.html";
});

// Функция рендера списка игроков NEWNEW
// function renderPlayers(players) {
//     console.log("🔄 Рендеринг игроков:", players);
//     playersContainer.innerHTML = "";
//
//     players.forEach((player) => {
//         const playerCard = document.createElement("div");
//         playerCard.classList.add("card");
//         playerCard.innerHTML = `
//             <h2>${player.name}</h2>
//             <p>ID: ${player.id || "N/A"}</p>
//             ${player.isAdmin ? "<a>Admin</a>" : ""}
//             ${
//             isAdmin && player.id !== socket.id
//                 ? `<button class="button__lobby-kick" data-id="${player.id}">Kick</button>
//                        <button class="button__lobby-admin" data-id="${player.id}">Admin</button>`
//                 : ""
//         }
//         `;
//         playersContainer.appendChild(playerCard);
//         console.log("✅ Игроки успешно добавлены в интерфейс!");
//     });
//
//     // Обработчики кнопок (доступны только админу)
//     if (isAdmin) {
//         document.querySelectorAll(".button__lobby-kick").forEach((button) => {
//             button.addEventListener("click", () => {
//                 const playerId = button.getAttribute("data-id");
//                 socket.emit("kickPlayer", playerId);
//             });
//         });
//
//         document.querySelectorAll(".button__lobby-admin").forEach((button) => {
//             button.addEventListener("click", () => {
//                 const playerId = button.getAttribute("data-id");
//                 socket.emit("transferAdmin", playerId);
//             });
//         });
//     }
// }
function renderPlayers(players) {
    console.log("🔄 Рендеринг игроков:", players);
    playersContainer.innerHTML = "";

    players.forEach((player) => {
        const playerCard = document.createElement("div");
        playerCard.classList.add("card");
        playerCard.innerHTML = `
            <h2>${player.name}</h2>
            <p>ID: ${player.id || "N/A"}</p>
            ${player.isAdmin ? "<a>Admin</a>" : ""}
            ${isAdmin && player.id !== socket.id ?
            `<button class="button__lobby-kick" data-id="${player.id}">Kick</button>
                 <button class="button__lobby-admin" data-id="${player.id}">Admin</button>`
            : ""}
        `;
        playersContainer.appendChild(playerCard);
    });

    // Обновляем обработчики кнопок
    if (isAdmin) {
        document.querySelectorAll(".button__lobby-kick").forEach((button) => {
            button.addEventListener("click", () => {
                const playerId = button.getAttribute("data-id");
                socket.emit("kickPlayer", playerId);
            });
        });

        document.querySelectorAll(".button__lobby-admin").forEach((button) => {
            button.addEventListener("click", () => {
                const playerId = button.getAttribute("data-id");
                socket.emit("transferAdmin", playerId);
            });
        });
    }
}
