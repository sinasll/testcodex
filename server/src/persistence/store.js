export class InMemoryStore {
  constructor() {
    this.games = new Map();
    this.auditLogs = [];
  }

  saveGame(game) {
    this.games.set(game.lobbyId, structuredClone(game));
  }

  getGame(lobbyId) {
    return this.games.get(lobbyId);
  }

  appendAudit(entry) {
    this.auditLogs.push({ ...entry, at: Date.now() });
  }
}
