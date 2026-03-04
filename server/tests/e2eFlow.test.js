import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';

// Lightweight e2e signaling test covering lobby join and state broadcast.
describe('lobby e2e flow', () => {
  let httpServer;
  let io;
  let port;
  beforeAll(async () => {
    const app = express();
    httpServer = createServer(app);
    io = new Server(httpServer);
    io.use((socket, next) => {
      socket.data.user = jwt.verify(socket.handshake.auth.token, 'test');
      next();
    });
    io.on('connection', (socket) => {
      socket.emit('game:state', { phase: 'lobby', players: [{ id: socket.data.user.sub, name: 'P1', alive: true }] });
    });
    await new Promise((resolve) => httpServer.listen(0, resolve));
    port = httpServer.address().port;
  });

  afterAll(async () => {
    await io.close();
    await new Promise((resolve) => httpServer.close(resolve));
  });

  it('connects and receives lobby snapshot', async () => {
    const token = jwt.sign({ sub: 'player-1', lobbyId: 'abc' }, 'test');
    const socket = Client(`http://localhost:${port}`, { auth: { token } });

    const payload = await new Promise((resolve) => socket.on('game:state', resolve));
    expect(payload.phase).toBe('lobby');
    socket.disconnect();
  });
});
