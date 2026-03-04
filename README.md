# Mafia Mini App (Telegram Web App + Standalone)

Production-oriented Mafia game for 4–12 players with an authoritative Node.js + Socket.io game engine and React + Tailwind mobile-first UI.

## Features
- Telegram WebApp user detection (`window.Telegram.WebApp.initData`) with fallback guest accounts.
- Authoritative server phases: `lobby -> dealing -> night -> dawn -> day -> voting -> finished`.
- Deterministic night resolver order:
  1. roleblocks/jail
  2. investigations
  3. lookout/tracker visit logs
  4. protections
  5. mafia kill
  6. other killers
  7. death application
  8. on-death triggers
- 12 default roles, configurable per lobby.
- Majority lynch voting with tie policy (`no-lynch`, `revote`, `coinflip`).
- Last will support, ghost chat, per-player sanitized state, reconnect grace, socket auth token validation.
- Voice chat signaling over Socket.io for mesh and SFU-ready env config examples (Jitsi/mediasoup).
- Optional persistence adapters: in-memory default + Postgres schema + Redis-ready env.

## Monorepo structure

- `server/` - Express + Socket.io authoritative backend and game engine.
- `client/` - React + Tailwind responsive front end.
- `docs/` - deployment and acceptance plans.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Client: `http://localhost:5173`
Server: `http://localhost:3001`

## Environment variables
See `.env.example` for complete list.

Required for production:
- `PORT`, `JWT_SECRET`
- `CORS_ORIGIN`, `APP_BASE_URL`
- `TURN_SERVER`, `TURN_USERNAME`, `TURN_PASSWORD` (voice reliability)
- `DATABASE_URL` for persisted game history/audits
- `SFU_PROVIDER`, `SFU_JITSI_DOMAIN` or mediasoup settings when scaling >8 players

## Scripts

- Root: `npm run dev`, `npm run build`, `npm test`
- Server: `npm run dev -w server`, `npm run test -w server`
- Client: `npm run dev -w client`, `npm run build -w client`

## Security and reliability
- Signed JWT socket auth and server-side validation for all actions.
- Never trust client for role assignment, win checks, or vote/night outcomes.
- Helmet, CORS, API rate limiting, Zod input validation.
- Reconnection handling + per-player state sanitization to avoid secret leakage.
- `/client-error` endpoint for lightweight client diagnostics.

## Voice deployment notes
- Mesh mode works for small rooms.
- For rooms above 8 players, use SFU (`SFU_PROVIDER=jitsi` or `mediasoup`).
- Always use HTTPS/WSS and TURN (coturn) in production.

## Docker

```bash
docker compose up --build
```

## Deploy targets
Sample deployment guides are in `docs/deployment.md` for Railway/Fly/Heroku.

## Testing

```bash
npm test
```

Includes server unit tests for resolver/voting/win checks and a lightweight e2e socket flow test.

## Production checklist
- [ ] HTTPS + WSS only
- [ ] TURN/coturn configured and reachable
- [ ] JWT secret rotated and strong
- [ ] CORS origin restricted
- [ ] Rate limits tuned
- [ ] Postgres backups configured
- [ ] Redis enabled for multi-instance session events
- [ ] SFU deployed for >8 concurrent voice users
