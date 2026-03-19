import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { randomUUID } from 'uuid';
import {
  addPlayer,
  applyLynch,
  assignRoles,
  castVote,
  checkWin,
  createGame,
  nominate,
  removePlayer,
  resolveNight,
  sanitizeForPlayer,
  submitNightAction,
  tallyVotes,
  transitionPhase,
} from './engine/gameEngine.js';
import { InMemoryStore } from './persistence/store.js';
import { ensureSchema, createPostgresPool } from './persistence/postgres.js';
import { signPlayerToken, verifyPlayerToken } from './security/auth.js';
import { actionSchema, lobbyCreateSchema, voteSchema } from './security/validation.js';
import { buildIceServers } from './voice/sfuExample.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN?.split(',') || '*' } });

const store = new InMemoryStore();
const pool = createPostgresPool(process.env.DATABASE_URL);
await ensureSchema(pool);

const lobbies = new Map();
const reconnectTimers = new Map();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/ice-config', (_req, res) => res.json({ iceServers: buildIceServers(process.env) }));
app.post('/client-error', (req, res) => {
  store.appendAudit({ lobbyId: req.body.lobbyId || 'unknown', actorId: req.body.playerId || null, eventType: 'client_error', payload: req.body });
  res.status(202).json({ accepted: true });
});

app.post('/api/lobbies', (req, res) => {
  const parsed = lobbyCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const lobbyId = randomUUID().slice(0, 8);
  const hostId = randomUUID();
  const game = createGame(lobbyId, { roles: parsed.data.roles, tiePolicy: parsed.data.tiePolicy });
  addPlayer(game, { id: hostId, name: parsed.data.name, isHost: true, telegramId: null });
  lobbies.set(lobbyId, game);
  store.saveGame(game);
  const token = signPlayerToken({ playerId: hostId, lobbyId, name: parsed.data.name }, process.env.JWT_SECRET || 'dev-secret');
  return res.status(201).json({ lobbyId, hostId, token, inviteLink: `${process.env.APP_BASE_URL || 'http://localhost:5173'}/join/${lobbyId}` });
});

app.get('/api/lobbies/:lobbyId', (req, res) => {
  const game = lobbies.get(req.params.lobbyId);
  if (!game) return res.status(404).json({ error: 'Not found' });
  return res.json({ lobbyId: game.lobbyId, phase: game.phase, players: game.players.map((p) => ({ id: p.id, name: p.name, alive: p.alive })) });
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) throw new Error('Missing token');
    socket.data.user = verifyPlayerToken(token, process.env.JWT_SECRET || 'dev-secret');
    next();
  } catch (err) {
    next(err);
  }
});

function broadcastLobbyState(game) {
  game.players.forEach((p) => {
    io.to(`player:${p.id}`).emit('game:state', sanitizeForPlayer(game, p.id));
  });
}

io.on('connection', (socket) => {
  const { sub: playerId, lobbyId } = socket.data.user;
  const game = lobbies.get(lobbyId);
  if (!game) {
    socket.disconnect();
    return;
  }

  socket.join(`lobby:${lobbyId}`);
  socket.join(`player:${playerId}`);

  const player = game.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = true;
    const existing = reconnectTimers.get(player.id);
    if (existing) clearTimeout(existing);
  }
  broadcastLobbyState(game);

  socket.on('lobby:join', ({ name, telegramId }, ack) => {
    if (game.players.find((p) => p.id === playerId)) return ack?.({ ok: true });
    try {
      addPlayer(game, { id: playerId, name, telegramId, isHost: false });
      store.saveGame(game);
      broadcastLobbyState(game);
      ack?.({ ok: true });
    } catch (error) {
      ack?.({ ok: false, error: error.message });
    }
  });

  socket.on('game:start', () => {
    if (!player?.isHost) return;
    if (game.players.length < 4) return;
    assignRoles(game);
    broadcastLobbyState(game);
  });

  socket.on('game:phase', ({ phase }) => {
    if (!player?.isHost) return;
    transitionPhase(game, phase);
    broadcastLobbyState(game);
  });

  socket.on('night:action', (payload, ack) => {
    const parsed = actionSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ ok: false, error: parsed.error.flatten() });
    try {
      submitNightAction(game, playerId, parsed.data);
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on('night:resolve', () => {
    if (!player?.isHost) return;
    const result = resolveNight(game);
    io.to(`lobby:${lobbyId}`).emit('night:result', result.logs);
    transitionPhase(game, 'day');
    broadcastLobbyState(game);
  });

  socket.on('day:nominate', ({ targetId }, ack) => {
    try {
      nominate(game, playerId, targetId);
      ack?.({ ok: true, nominations: game.nominations });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on('vote:cast', (payload, ack) => {
    const parsed = voteSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ ok: false, error: parsed.error.flatten() });
    try {
      castVote(game, playerId, parsed.data.targetId);
      io.to(`lobby:${lobbyId}`).emit('vote:update', game.votes);
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on('vote:close', () => {
    if (!player?.isHost) return;
    const result = tallyVotes(game);
    const reveal = applyLynch(game, result);
    io.to(`lobby:${lobbyId}`).emit('vote:result', { result, reveal });
    const winner = checkWin(game);
    if (winner) {
      game.winner = winner.winner;
      transitionPhase(game, 'finished');
      io.to(`lobby:${lobbyId}`).emit('game:finished', winner);
    } else {
      transitionPhase(game, 'night');
    }
    broadcastLobbyState(game);
  });

  socket.on('will:update', ({ text }) => {
    game.lastWillByPlayer[playerId] = `${text || ''}`.slice(0, 500);
  });

  socket.on('chat:ghost', ({ message }) => {
    if (player?.alive) return;
    const entry = { playerId, message: `${message}`.slice(0, 300), at: Date.now() };
    game.deadChat.push(entry);
    game.players.filter((p) => !p.alive).forEach((p) => io.to(`player:${p.id}`).emit('chat:ghost', entry));
  });

  socket.on('voice:signal', ({ targetId, signal }) => {
    io.to(`player:${targetId}`).emit('voice:signal', { from: playerId, signal });
  });

  socket.on('disconnect', () => {
    removePlayer(game, playerId);
    const grace = game.config.timers.reconnectGrace * 1000;
    reconnectTimers.set(playerId, setTimeout(() => {
      const p = game.players.find((x) => x.id === playerId);
      if (p && !p.connected) store.appendAudit({ lobbyId, actorId: playerId, eventType: 'player_timeout', payload: {} });
    }, grace));
    broadcastLobbyState(game);
  });
});

const port = Number(process.env.PORT || 3001);
server.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
