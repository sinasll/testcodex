import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(token) {
  const [connected, setConnected] = useState(false);
  const socket = useMemo(() => (token ? io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001', { auth: { token } }) : null), [token]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => socket.disconnect();
  }, [socket]);

  return { socket, connected };
}
