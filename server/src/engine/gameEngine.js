import { randomUUID } from 'uuid';
import { ALIGNMENTS, DEFAULT_ROLES, NIGHT_PRIORITY } from './roles.js';

export const PHASES = ['lobby', 'dealing', 'night', 'dawn', 'day', 'voting', 'finished'];

export function createGame(lobbyId, options = {}) {
  return {
    id: randomUUID(),
    lobbyId,
    phase: 'lobby',
    players: [],
    config: {
      roles: options.roles || DEFAULT_ROLES,
      tiePolicy: options.tiePolicy || 'no-lynch',
      timers: {
        nightTotal: options?.timers?.nightTotal ?? 60,
        dayDiscussion: options?.timers?.dayDiscussion ?? 300,
        votingWindow: options?.timers?.votingWindow ?? 90,
        reconnectGrace: options?.timers?.reconnectGrace ?? 60,
        microWindow: options?.timers?.microWindow ?? 15,
      },
    },
    dayNumber: 0,
    logs: [],
    lastWillByPlayer: {},
    nominations: {},
    votes: {},
    pendingNightActions: {},
    visitLog: {},
    deadChat: [],
    winner: null,
  };
}

export function sanitizeForPlayer(game, playerId) {
  const me = game.players.find((p) => p.id === playerId);
  return {
    ...game,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      connected: p.connected,
      isHost: p.isHost,
      role: p.id === playerId || !p.alive || game.phase === 'finished' ? p.role : undefined,
    })),
    pendingNightActions: undefined,
    votes: game.phase === 'voting' || game.phase === 'finished' ? game.votes : undefined,
    myRole: me?.role,
  };
}

export function addPlayer(game, player) {
  if (game.players.length >= 12) throw new Error('Lobby full');
  if (game.phase !== 'lobby') throw new Error('Game already started');
  game.players.push({ ...player, alive: true, connected: true, jailed: false, roleBlocked: false });
}

export function removePlayer(game, playerId) {
  const target = game.players.find((p) => p.id === playerId);
  if (target) target.connected = false;
}

export function assignRoles(game, rng = Math.random) {
  game.phase = 'dealing';
  const roles = [...game.config.roles].slice(0, game.players.length);
  while (roles.length < game.players.length) roles.push('Townsperson');
  for (let i = roles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  game.players.forEach((p, idx) => {
    p.role = roles[idx];
  });
  game.logs.push({ type: 'roles_assigned', at: Date.now() });
  transitionPhase(game, 'night');
}

export function transitionPhase(game, next) {
  if (!PHASES.includes(next)) throw new Error('Invalid phase');
  game.phase = next;
  if (next === 'night') {
    game.dayNumber += 1;
    game.pendingNightActions = {};
    game.visitLog = {};
    game.players.forEach((p) => {
      p.jailed = false;
      p.roleBlocked = false;
    });
  }
}

export function submitNightAction(game, actorId, action) {
  const actor = requireAlive(game, actorId);
  if (game.phase !== 'night') throw new Error('Not night');
  game.pendingNightActions[actorId] = { ...action, actorRole: actor.role };
}

function requireAlive(game, playerId) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found');
  if (!player.alive) throw new Error('Dead players cannot act');
  return player;
}

export function resolveNight(game) {
  const logs = [];
  const deaths = new Set();
  const saves = new Set();
  const blocked = new Set();
  const visits = {};

  for (const [actorId, action] of Object.entries(game.pendingNightActions)) {
    if (['roleblock', 'jail'].includes(action.type)) {
      blocked.add(action.targetId);
      if (action.type === 'jail') {
        const target = game.players.find((p) => p.id === action.targetId);
        if (target) target.jailed = true;
      }
      logs.push({ type: 'control', actorId, targetId: action.targetId });
    }
  }

  for (const [actorId, action] of Object.entries(game.pendingNightActions)) {
    if (blocked.has(actorId)) continue;
    if (['investigate', 'consigliere'].includes(action.type)) {
      const target = game.players.find((p) => p.id === action.targetId);
      logs.push({ type: 'investigation', actorId, targetId: target?.id, result: ALIGNMENTS[target?.role] || 'unknown' });
    }
  }

  for (const [actorId, action] of Object.entries(game.pendingNightActions)) {
    if (blocked.has(actorId)) continue;
    if (['lookout', 'track'].includes(action.type)) {
      visits[action.targetId] ||= [];
      visits[action.targetId].push(actorId);
      logs.push({ type: 'visit_log', actorId, targetId: action.targetId, visitors: visits[action.targetId] });
    }
  }

  for (const [actorId, action] of Object.entries(game.pendingNightActions)) {
    if (blocked.has(actorId)) continue;
    if (['heal', 'guard', 'vest'].includes(action.type)) {
      saves.add(action.targetId || actorId);
      logs.push({ type: 'protection', actorId, targetId: action.targetId || actorId });
    }
  }

  for (const [actorId, action] of Object.entries(game.pendingNightActions)) {
    if (blocked.has(actorId)) continue;
    if (action.type === 'mafia_kill') {
      if (!saves.has(action.targetId)) deaths.add(action.targetId);
      logs.push({ type: 'mafia_attack', actorId, targetId: action.targetId, saved: saves.has(action.targetId) });
    }
  }

  for (const [actorId, action] of Object.entries(game.pendingNightActions)) {
    if (blocked.has(actorId)) continue;
    if (['vigilante_shot', 'serial_kill'].includes(action.type)) {
      if (!saves.has(action.targetId)) deaths.add(action.targetId);
      logs.push({ type: 'killer_attack', actorId, targetId: action.targetId, saved: saves.has(action.targetId) });
    }
  }

  game.players.forEach((p) => {
    if (deaths.has(p.id)) {
      p.alive = false;
      logs.push({ type: 'death', playerId: p.id, role: p.role });
    }
  });

  for (const deadId of deaths) {
    const dead = game.players.find((p) => p.id === deadId);
    if (dead?.role === 'Jester') {
      logs.push({ type: 'on_death', playerId: deadId, effect: 'haunt_enabled' });
    }
  }

  game.logs.push(...logs, { type: 'night_resolved', priority: NIGHT_PRIORITY, at: Date.now() });
  game.visitLog = visits;
  transitionPhase(game, 'dawn');
  return { logs, deaths: [...deaths], saves: [...saves] };
}

export function nominate(game, nominatorId, targetId) {
  requireAlive(game, nominatorId);
  requireAlive(game, targetId);
  game.nominations[targetId] = (game.nominations[targetId] || 0) + 1;
}

export function castVote(game, voterId, targetId) {
  requireAlive(game, voterId);
  if (game.phase !== 'voting') throw new Error('Not voting phase');
  if (targetId) requireAlive(game, targetId);
  game.votes[voterId] = targetId;
}

export function tallyVotes(game) {
  const living = game.players.filter((p) => p.alive);
  const needed = Math.floor(living.length / 2) + 1;
  const counts = {};
  Object.values(game.votes).forEach((targetId) => {
    if (!targetId) return;
    counts[targetId] = (counts[targetId] || 0) + 1;
  });
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!ordered.length) return { lynchedId: null, reason: 'no-votes', counts, needed };
  const [topId, topVotes] = ordered[0];
  const tied = ordered.filter(([, v]) => v === topVotes);
  if (tied.length > 1) {
    if (game.config.tiePolicy === 'coinflip') {
      const pick = tied[Math.floor(Math.random() * tied.length)][0];
      return { lynchedId: pick, reason: 'coinflip', counts, needed };
    }
    if (game.config.tiePolicy === 'revote') {
      return { lynchedId: null, reason: 'revote', counts, needed };
    }
    return { lynchedId: null, reason: 'tie-no-lynch', counts, needed };
  }
  if (topVotes < needed) {
    return { lynchedId: null, reason: 'no-majority', counts, needed };
  }
  return { lynchedId: topId, reason: 'majority', counts, needed };
}

export function applyLynch(game, result) {
  if (!result.lynchedId) return null;
  const target = game.players.find((p) => p.id === result.lynchedId);
  if (!target) return null;
  target.alive = false;
  const reveal = { playerId: target.id, role: target.role, lastWill: game.lastWillByPlayer[target.id] || '' };
  game.logs.push({ type: 'lynch', ...reveal, reason: result.reason });
  return reveal;
}

export function checkWin(game) {
  const living = game.players.filter((p) => p.alive);
  const mafia = living.filter((p) => ALIGNMENTS[p.role] === 'mafia');
  const town = living.filter((p) => ALIGNMENTS[p.role] === 'town');
  const sk = living.filter((p) => p.role === 'Serial Killer');

  if (!mafia.length && !sk.length && town.length) return { winner: 'Town' };
  if (mafia.length && mafia.length >= town.length + sk.length) return { winner: 'Mafia' };
  if (sk.length && living.length === sk.length) return { winner: 'Serial Killer' };
  return null;
}
