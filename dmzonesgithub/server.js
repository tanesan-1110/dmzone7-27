// server.js
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

let rooms = {}; // 各部屋ごとの状態を保存

io.on('connection', (socket) => {
  console.log("新しい接続: ", socket.id);
  let joinedRoom = null;

  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = { players: [], gameState: null };
    if (rooms[roomId].players.length >= 2) {
      socket.emit('roomFull');
      return;
    }
    rooms[roomId].players.push(socket.id);
    joinedRoom = roomId;
    socket.join(roomId);

    socket.emit('joined', rooms[joinedRoom].players.length);
    io.to(roomId).emit('playerCount', rooms[roomId].players.length);

    // 誰かが抜けたらクリーンアップ
    socket.on('disconnect', () => {
      if (joinedRoom && rooms[joinedRoom]) {
        rooms[joinedRoom].players = rooms[joinedRoom].players.filter(id => id !== socket.id);
        if (rooms[joinedRoom].players.length === 0) delete rooms[joinedRoom];
        else io.to(joinedRoom).emit('playerCount', rooms[joinedRoom].players.length);
      }
    });
  });

  // ゲーム開始/状態変更
  socket.on('syncState', ({ roomId, state }) => {
    console.log("サーバーでsyncState受信:", roomId, state);
    if (!rooms[roomId]) return;
    rooms[roomId].gameState = state;
    io.to(roomId).emit('syncState', state); // 送信者以外に同期
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- ここから下を追加！ ---
const distPath = path.join(__dirname, 'dist'); // Viteの場合はdist、CRAの場合はbuild

app.use(express.static(path.join(__dirname, 'dist')));

// すべてのリクエストはReactのindex.htmlを返す（クライアントルーティング対応）
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
