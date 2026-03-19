import jwt from 'jsonwebtoken';

export function signPlayerToken({ playerId, lobbyId, name }, secret) {
  return jwt.sign({ sub: playerId, lobbyId, name }, secret, { expiresIn: '7d' });
}

export function verifyPlayerToken(token, secret) {
  return jwt.verify(token, secret);
}
