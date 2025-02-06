const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const authRouter = require('./public/authRouter');
const mongoose = require("mongoose");

// Инициализация приложения
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Хранение игровых сессий
const gameSessions = {}; // { sessionId: { players: { [socketId]: { name, isAdmin } } } }

// Парсер JSON
app.use(express.json());
app.use("/auth", authRouter);

// Обслуживание статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Обслуживание папки с картинками img
app.use('/img', express.static(path.join(__dirname, 'img')));

// Обработка корневого маршрута
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lobby.html'));
});

// Используем уже существующую коллекцию "users" без создания схемы
const User = mongoose.connection.collection("users");

// API для получения количества пользователей
app.get("/auth/user-count", async (req, res) => {
    try {
        const count = await User.countDocuments(); // Получаем количество документов
        res.json({ count });
    } catch (error) {
        console.error("Ошибка при получении количества пользователей:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

app.get("/auth/checkSession/:sessionId", (req, res) => {
    const { sessionId } = req.params;
    if (gameSessions[sessionId]) {
        res.json({ exists: true });
    } else {
        res.json({ exists: false });
    }
});
// Запрос активных лобби
app.get('/getActiveLobbies', (req, res) => {
    const activeLobbies = Object.keys(gameSessions).map(sessionId => {
        const session = gameSessions[sessionId];
        return {
            lobbyName: session.lobbyName,
            sessionId: sessionId,
            playersCount: Object.keys(session.players).length,
            maxPlayers: 8 // Можно сделать настраиваемым
        };
    });

    res.json(activeLobbies);
});


// Генерация уникального ID для игровой сессии
function generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Получение ID сессии по ID сокета
function getSessionId(socket) {
    return Object.keys(gameSessions).find(sessionId => gameSessions[sessionId].players[socket.id]);
}

// Обработка подключений WebSocket
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    //Создание новой игровой сессии
    socket.on('createGame', ({playerName, lobbyName}) => {
        const sessionId = generateSessionId();
        gameSessions[sessionId] = {
            players: {
                [socket.id]: { id: socket.id, name: playerName, isAdmin: true }
            },
            lobbyName: lobbyName, // Сохраняем название лобби
            state: 'waiting',
        };
        socket.join(sessionId);
        socket.emit('gameCreated', { sessionId, lobbyName });
        console.log(`📡 Отправка обновления игроков в сессию ${sessionId}:`, Object.values(gameSessions[sessionId].players));
        io.to(sessionId).emit('updateLobbyName', lobbyName); // Отправляем название всем
        io.to(sessionId).emit('updatePlayers', Object.values(gameSessions[sessionId].players));
        io.to(sessionId).emit('updateAdmin', socket.id);
        console.log(`${playerName} created game: ${sessionId}`);
    });



    socket.on("reconnectPlayer", ({ sessionId, playerName, oldSocketId }) => {
        if (!gameSessions[sessionId]) {
            console.log(`❌ Ошибка: сессия ${sessionId} не найдена!`);
            socket.emit("error", "Session no longer exists.");
            return;
        }

        const session = gameSessions[sessionId];
        session.awaitingReconnect = false; // Остановить удаление сессии

        if (session.disconnectedPlayers && session.disconnectedPlayers[playerName]) {
            // Восстанавливаем игрока в сессии
            session.players[socket.id] = {
                id: socket.id,
                name: session.disconnectedPlayers[playerName].name,
                isAdmin: session.disconnectedPlayers[playerName].isAdmin
            };

            delete session.disconnectedPlayers[playerName]; // Удаляем из списка отключённых

            console.log(`🔄 Игрок ${playerName} успешно переподключился с новым ID: ${socket.id}`);

            socket.join(sessionId);
            io.to(sessionId).emit("updatePlayers", Object.values(session.players));
            io.to(sessionId).emit("updateAdmin", session.players[socket.id].isAdmin ? socket.id : null);
        } else {
            console.log(`⚠️ Игрок ${playerName} не найден в истории отключений.`);
            socket.emit("error", "Вы не были в этой сессии.");
        }
    });


    // Присоединение к существующей игровой сессии
    socket.on('joinGame', ({ sessionId, playerName }) => {
        if (!gameSessions[sessionId]) {
            socket.emit('error', 'Session does not exist');
            return;
        }

        const session = gameSessions[sessionId];
        if (session.players[socket.id]) {
            socket.emit('error', 'You are already in this session');
            return;
        }

        session.players[socket.id] = { id: socket.id, name: playerName, isAdmin: false };
        socket.join(sessionId);
        console.log(`📡 Отправка обновления игроков в сессию ${sessionId}:`, Object.values(gameSessions[sessionId].players));

        socket.emit('updateLobbyName', session.lobbyName); // Отправляем название лобби новому игроку
        io.to(sessionId).emit('updatePlayers', Object.values(gameSessions[sessionId].players));
        console.log(`${playerName} joined game: ${sessionId}`);
    });

    // Исключение игрока
    socket.on('kickPlayer', (playerId) => {
        const sessionId = getSessionId(socket);
        if (!sessionId) return;

        const session = gameSessions[sessionId];
        if (!session.players[socket.id]?.isAdmin) {
            socket.emit('error', 'Only the admin can kick players.');
            return;
        }

        if (session.players[playerId]) {
            delete session.players[playerId];
            io.to(playerId).emit('kicked'); // Отправляем уведомление исключённому игроку
            io.sockets.sockets.get(playerId)?.leave(sessionId); // Исключаем игрока из комнаты
            console.log(`📡 Отправка обновления игроков в сессию ${sessionId}:`, Object.values(gameSessions[sessionId].players));
            io.to(sessionId).emit('updatePlayers', Object.values(gameSessions[sessionId].players)); // Обновляем список игроков
        }
    });

    // Передача прав администратора
    socket.on('transferAdmin', (newAdminId) => {
        const sessionId = getSessionId(socket);
        if (!sessionId) return;

        const session = gameSessions[sessionId];
        if (!session.players[socket.id]?.isAdmin) {
            socket.emit('error', 'Only the admin can transfer admin rights.');
            return;
        }

        if (session.players[newAdminId]) {
            Object.values(session.players).forEach(player => player.isAdmin = false);
            session.players[newAdminId].isAdmin = true;
            io.to(sessionId).emit('updateAdmin', newAdminId); // Обновляем администратора
            console.log(`📡 Отправка обновления игроков в сессию ${sessionId}:`, Object.values(gameSessions[sessionId].players));
            io.to(sessionId).emit('updatePlayers', Object.values(gameSessions[sessionId].players));
        }
    });

    // Обработка отключения игрока
    socket.on('disconnect', () => {
        const sessionId = getSessionId(socket);
        if (!sessionId) return;

        const session = gameSessions[sessionId];
        if (!session || !session.players[socket.id]) return;

        const wasAdmin = session.players[socket.id].isAdmin;
        const playerName = session.players[socket.id].name;

        // Удаляем игрока из списка, но сохраняем его имя
        delete session.players[socket.id];

        // Если админ отключился, но есть другие игроки, передаём права админа другому
        // if (wasAdmin && Object.keys(session.players).length > 0) { NEWNEW
        //     const newAdminId = Object.keys(session.players)[0];
        //     session.players[newAdminId].isAdmin = true;
        //     io.to(sessionId).emit('updateAdmin', newAdminId);
        //     console.log(`👑 Новый админ: ${newAdminId}`);
        // }
        if (wasAdmin && Object.keys(session.players).length > 0) {
            const newAdminId = Object.keys(session.players)[0];
            if (session.players[newAdminId]) {
                session.players[newAdminId].isAdmin = true;
                io.to(sessionId).emit('updateAdmin', newAdminId);
                console.log(`👑 Новый админ: ${newAdminId}`);
            }
        }


        // ✅ Сохраняем информацию о последнем администраторе
        if (wasAdmin) {
            session.lastAdmin = playerName;
        }

        session.disconnectedPlayers = session.disconnectedPlayers || {};
        session.disconnectedPlayers[playerName] = {
            id: socket.id,
            name: playerName,
            isAdmin: wasAdmin
        };

        console.log(`🔄 Игрок ${playerName} отключился, сохранили данные для возможного возврата.`);

        io.to(sessionId).emit('updatePlayers', Object.values(session.players));

        // Удаление лобби через 5 секунд, если никто не переподключится
        if (Object.keys(session.players).length === 0) {
            setTimeout(() => {
                if (Object.keys(gameSessions[sessionId]?.players || {}).length === 0) {
                    delete gameSessions[sessionId];
                    console.log(`❌ Сессия ${sessionId} удалена, никто не переподключился.`);
                }
            }, 10000);
        }

        console.log('A user disconnected:', socket.id);
    });




    // Уведомление исключенного игрока
    socket.on('kicked', () => {
        socket.emit('error', 'You have been kicked from the session.');
    });
});

// Запуск сервера
const PORT = 3000;
server.listen(PORT, async () => {
    try {
        await mongoose.connect('mongodb+srv://santi:3Y9NMxs8ERrWB1g0@cluster0.oqajc.mongodb.net/'); // Установка соединения с базой данных
        console.log(`Server is running on http://192.168.52.103:${PORT}`);
    } catch (err) {
        console.error("Failed to start server due to database connection error.");
        process.exit(1); // Завершение работы при ошибке подключения
    }
});