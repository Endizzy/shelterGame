const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Инициализация приложения
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Хранение игровых сессий
const gameSessions = {};

// Обслуживание статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Обработка корневого маршрута (можно убрать, если index.html уже обслуживается)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка подключений WebSocket
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Создание новой игровой сессии
    socket.on('createGame', () => {
        const sessionId = `session-${Date.now()}`;
        gameSessions[sessionId] = {
            players: [],
            state: 'waiting',
        };
        socket.join(sessionId);
        socket.emit('gameCreated', { sessionId });
        console.log('Game created:', sessionId);
    });

    // Присоединение к существующей игровой сессии
    socket.on('joinGame', ({ sessionId, playerName }) => {
        if (!gameSessions[sessionId]) {
            socket.emit('error', 'Session does not exist');
            return;
        }
        const session = gameSessions[sessionId];
        session.players.push({ id: socket.id, name: playerName });
        socket.join(sessionId);
        io.to(sessionId).emit('updatePlayers', session.players);
        console.log(`${playerName} joined ${sessionId}`);
    });

    // Обработка отключения игрока
    socket.on('disconnect', () => {
        for (const sessionId in gameSessions) {
            const session = gameSessions[sessionId];
            session.players = session.players.filter((p) => p.id !== socket.id);
            io.to(sessionId).emit('updatePlayers', session.players);
        }
        console.log('A user disconnected:', socket.id);
    });
});

// Запуск сервера
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
