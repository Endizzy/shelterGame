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

    // Создание новой игровой сессии
    socket.on('createGame', (playerName) => {
        const sessionId = generateSessionId();
        gameSessions[sessionId] = {
            players: {
                [socket.id]: { id: socket.id, name: playerName, isAdmin: true }
            },
            state: 'waiting',
        };
        socket.join(sessionId);
        socket.emit('gameCreated', { sessionId });
        io.to(sessionId).emit('updatePlayers', Object.values(gameSessions[sessionId].players));
        io.to(sessionId).emit('updateAdmin', socket.id);
        console.log(`${playerName} created game: ${sessionId}`);
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
            io.to(sessionId).emit('updatePlayers', Object.values(gameSessions[sessionId].players));
        }
    });

    // Обработка отключения игрока
    socket.on('disconnect', () => {
        const sessionId = getSessionId(socket);
        if (!sessionId) return;

        const session = gameSessions[sessionId];
        const wasAdmin = session.players[socket.id]?.isAdmin;
        delete session.players[socket.id];

        // Если админ отключился, передать права другому игроку
        if (wasAdmin && Object.keys(session.players).length > 0) {
            const newAdminId = Object.keys(session.players)[0];
            session.players[newAdminId].isAdmin = true;
            io.to(sessionId).emit('updateAdmin', newAdminId);
        }

        io.to(sessionId).emit('updatePlayers', Object.values(session.players));

        // Удалить лобби, если оно пустое
        if (Object.keys(session.players).length === 0) {
            delete gameSessions[sessionId];
            console.log(`Session ${sessionId} deleted because it's empty.`);
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
