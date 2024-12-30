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

// Обслуживание папки с картинками img
app.use('/img', express.static(path.join(__dirname, 'img')));

// Обработка корневого маршрута
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка подключений WebSocket
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Создание новой игровой сессии
    socket.on('createGame', (playerName) => {
        // Удаляем пользователя из предыдущего лобби, если он уже где-то состоит
        for (const sessionId in gameSessions) {
            const session = gameSessions[sessionId];
            session.players = session.players.filter((p) => p.id !== socket.id);
            io.to(sessionId).emit('updatePlayers', session.players);

            // Если лобби стало пустым, удаляем его
            if (session.players.length === 0) {
                delete gameSessions[sessionId];
                console.log(`Session ${sessionId} deleted because it's empty.`);
            }
        }

        // Создаем новую сессию
        const sessionId = `session-${Date.now()}`;
        gameSessions[sessionId] = {
            players: [{ id: socket.id, name: playerName }], // Добавляем создателя
            state: 'waiting',
        };
        socket.join(sessionId);
        socket.emit('gameCreated', { sessionId });
        io.to(sessionId).emit('updatePlayers', gameSessions[sessionId].players);
        console.log(`${playerName} created game: ${sessionId}`);
    });

    // Присоединение к существующей игровой сессии
    socket.on('joinGame', ({ sessionId, playerName }) => {
        if (!gameSessions[sessionId]) {
            socket.emit('error', 'Session does not exist');
            return;
        }

        const session = gameSessions[sessionId];
        if (session.players.some((player) => player.id === socket.id)) {
            socket.emit('error', 'You are already in this session');
            return;
        }

        session.players.push({ id: socket.id, name: playerName });
        socket.join(sessionId);
        io.to(sessionId).emit('updatePlayers', session.players);
        console.log(`${playerName} joined game: ${sessionId}`);
    });

    // Обработка отключения игрока
    socket.on('disconnect', () => {
        for (const sessionId in gameSessions) {
            const session = gameSessions[sessionId];
            session.players = session.players.filter((p) => p.id !== socket.id);
            io.to(sessionId).emit('updatePlayers', session.players);

            // Удаляем лобби, если оно стало пустым
            if (session.players.length === 0) {
                delete gameSessions[sessionId];
                console.log(`Session ${sessionId} deleted because it's empty.`);
            }
        }
        console.log('A user disconnected:', socket.id);
    });
});

// Запуск сервера
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
