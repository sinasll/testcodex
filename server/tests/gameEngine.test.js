import { describe, expect, it } from 'vitest';
import {
  addPlayer,
  applyLynch,
  castVote,
  checkWin,
  createGame,
  resolveNight,
  submitNightAction,
  tallyVotes,
  transitionPhase,
} from '../src/engine/gameEngine.js';

describe('night resolver', () => {
  it('resolves actions with deterministic priority and protections', () => {
    const game = createGame('abc', { roles: ['Doctor', 'Mafioso', 'Sheriff', 'Townsperson'] });
    addPlayer(game, { id: 'p1', name: 'Doc', isHost: true });
    addPlayer(game, { id: 'p2', name: 'Maf', isHost: false });
    addPlayer(game, { id: 'p3', name: 'Sher', isHost: false });
    addPlayer(game, { id: 'p4', name: 'Town', isHost: false });
    game.players[0].role = 'Doctor';
    game.players[1].role = 'Mafioso';
    game.players[2].role = 'Sheriff';
    game.players[3].role = 'Townsperson';
    transitionPhase(game, 'night');

    submitNightAction(game, 'p1', { type: 'heal', targetId: 'p4' });
    submitNightAction(game, 'p2', { type: 'mafia_kill', targetId: 'p4' });
    submitNightAction(game, 'p3', { type: 'investigate', targetId: 'p2' });

    const result = resolveNight(game);
    expect(result.deaths).toEqual([]);
    expect(result.saves).toContain('p4');
    expect(result.logs.map((x) => x.type)).toContain('investigation');
  });
});

describe('vote tally + lynch', () => {
  it('requires majority of living players', () => {
    const game = createGame('vote');
    ['a', 'b', 'c', 'd', 'e'].forEach((id, i) => addPlayer(game, { id, name: id, isHost: i === 0 }));
    game.players.forEach((p) => { p.role = 'Townsperson'; });
    transitionPhase(game, 'voting');
    castVote(game, 'a', 'e');
    castVote(game, 'b', 'e');
    castVote(game, 'c', 'e');
    const tally = tallyVotes(game);
    expect(tally.lynchedId).toBe('e');
    const reveal = applyLynch(game, tally);
    expect(reveal.role).toBe('Townsperson');
  });
});

describe('win checks', () => {
  it('declares mafia when parity reached', () => {
    const game = createGame('w');
    addPlayer(game, { id: 'm', name: 'm', isHost: true });
    addPlayer(game, { id: 't', name: 't', isHost: false });
    game.players[0].role = 'Mafioso';
    game.players[1].role = 'Townsperson';
    expect(checkWin(game)).toEqual({ winner: 'Mafia' });
  });
});
