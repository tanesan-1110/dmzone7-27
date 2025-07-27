// 例: src/hooks/useSocketSync.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useSocketSync(roomId, gameState, setGameState) {
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io("http://localhost:3001"); // サーバーURL
    // 部屋へ参加
    socketRef.current.emit('join-room', roomId);

    // サーバーからの同期通知を受信
    socketRef.current.on('sync-state', (newState) => {
      setGameState(newState);
    });

    // クリーンアップ
    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId, setGameState]);

  // 自分が何か操作したときにサーバーへ送信する関数
  const sendUpdate = (newState) => {
    socketRef.current.emit('update-state', { roomId, gameState: newState });
  };

  return { sendUpdate };
}
