# Deployment notes

## Railway
1. Create two services (`server`, `client`) from monorepo paths.
2. Set `JWT_SECRET`, `CORS_ORIGIN`, `APP_BASE_URL`, TURN/SFU vars.
3. Attach Postgres and Redis plugins.
4. Enforce HTTPS origin URLs.

## Fly.io
1. `fly launch` for `server/` and `client/` apps.
2. Configure internal network for server/client comms.
3. `fly secrets set JWT_SECRET=... TURN_SERVER=...`
4. Scale server and migrate to Redis adapter for Socket.io pub/sub.

## Heroku
1. Create pipelines for `server` and static `client` (or host client on CDN).
2. Add Heroku Postgres and Redis add-ons.
3. Set config vars from `.env.example`.
4. Use ACM TLS and secure websocket endpoints.
