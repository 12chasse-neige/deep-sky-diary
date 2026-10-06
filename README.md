# 深空手记 · Deep Sky Diary

A private multi-user observation diary. The React/TypeScript interface talks to one Scala HTTP API; PostgreSQL stores accounts, sessions and observations. The existing sky background, optional video, search, filters and JSON export remain available.

## Local setup on macOS

Requirements: JDK 21, sbt (the project pins sbt 1.12.13), PostgreSQL 18, Node/npm. IntelliJ can open the root sbt project; WebStorm can open `frontend/`.

```sh
brew install openjdk@21 sbt postgresql@18
python3 scripts/setup-local-db.py
./scripts/backend.sh run
```

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

Open [the diary](http://127.0.0.1:5173). Register your own username and password; no demo login or administrator account is preconfigured. Different accounts have separate private diaries. There is no email verification or password recovery in this local version.

The setup helper creates an isolated cluster in `.local/postgres`, bound only to `127.0.0.1:5432`, with SCRAM authentication, a restricted `deep_sky` login, and separate `deep_sky` / `deep_sky_test` databases. It writes randomly generated credentials to ignored `.env.local` (mode 0600), without printing them. It does not start a system login service or modify Postgres.app databases. If port 5432 is already occupied, stop the other server or use the manual setup below. Do not delete `.local/postgres`: it contains your records.

Restart this project's database with `python3 scripts/setup-local-db.py`. Stop it with:

```sh
/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D .local/postgres stop -m fast
```

### Existing PostgreSQL installation

Create a login with a strong password and a database it owns. Copy `.env.example` to `.env.local`, update the connection settings, and run `./scripts/backend.sh run`. Flyway applies migrations automatically before accepting requests. The test database must be separate and its name must end in `_test`.

### pgAdmin

pgAdmin is an optional visual database client, not a server dependency. Install pgAdmin 4 if desired and register a server using host `127.0.0.1`, port `5432`, maintenance database `deep_sky`, username `deep_sky`, and the password from `.env.local`. Do not use the bootstrap superuser for the application. Inspect `users`, `sessions`, and `observations` under `public`; passwords and raw session tokens are never stored there.

## Configuration

Only the backend receives these variables; never put credentials in `VITE_*` variables.

| Variable | Meaning |
| --- | --- |
| `DB_URL` | JDBC URL, default `jdbc:postgresql://127.0.0.1:5432/deep_sky` |
| `DB_USER` / `DB_PASSWORD` | Database role and required password |
| `API_HOST` / `API_PORT` | Defaults `127.0.0.1` / `8080` |
| `APP_ORIGINS` | Exact comma-separated browser origins accepted for writes |
| `COOKIE_SECURE` | `false` for loopback HTTP; `true` for future HTTPS |
| `TEST_DB_URL` | Dedicated integration-test database ending in `_test` |

Vite uses port 5173 strictly and proxies `/api` to 8080 without changing the browser Origin. Production hosting is not configured. A future deployment should serve frontend and API on one HTTPS origin, update the origin allowlist, enable secure cookies, and add operational backups. `npm run preview` alone is not the full application.

## Backend organization

- `config`: environment settings; no checked-in secrets.
- `domain`: JSON models and input validation, independent of HTTP/database effects.
- `db`: Flyway setup, pooled connections, parameterized queries and transactions.
- `services`: Argon2id password checks, session creation and authentication throttling.
- `http`: JSON endpoints, cookie handling, CSRF and error responses.
- `src/main/resources/db/migration`: append-only SQL migrations. Add a new version rather than editing applied migrations.

The backend uses http4s Ember, Cats Effect, Circe, Doobie/HikariCP, PostgreSQL JDBC, Flyway and Password4j. Library versions are pinned in `build.sbt` and the server uses the existing Scala 3.4.2 project.

## API contract

All responses carry `Cache-Control: no-store`. Errors use `{ "error": { "code": "...", "message": "..." } }`. Writes require an allowed `Origin` and `X-Requested-With: DeepSkyDiary`; JSON requests also require `Content-Type: application/json`. No permissive CORS is enabled.

| Method and path | Result |
| --- | --- |
| `POST /api/auth/register` | `{username,password}` → 201 `{id,username}` + session cookie |
| `POST /api/auth/login` | Same input → 200 user + new session cookie |
| `GET /api/auth/me` | Current user or 401 |
| `POST /api/auth/logout` | Revoke current session, clear cookie, 204 |
| `GET /api/observations` | Current user's array, newest-created first |
| `POST /api/observations` | Observation draft → 201 saved record |
| `DELETE /api/observations/:id` | 204 for an owned record; otherwise 404 |
| `GET /api/health` | 200 `ready` or 503 `unavailable` |

Observation drafts require `object`, `kind`, `date`, `location`, `equipment`, `sky`, and `text`. Optional fields are `telescope`, `camera` (160 characters each), `latitude` (−90 to 90 degrees), `longitude` (−180 to 180 degrees), `seeing` (0.01–100 arcseconds), `cloudCover` and `humidity` (0–100 percent). Coordinates must be supplied as a pair; numeric fields may be null when unrecorded. Legacy requests without these fields remain supported, and existing equipment notes remain available. Migration V2 adds nullable columns without rewriting old observations. The server adds `id` and `createdAt`; owner IDs are never accepted from the browser. Dates are `YYYY-MM-DD` calendar dates and creation timestamps are UTC instants. Text limits match the form: object 100, location 120, equipment 160, notes 10000 characters. Object and notes must be nonblank; date must be real; kind/sky must be valid choices. Optional location/equipment use empty strings. Invalid or unknown fields are rejected.

Usernames normalize to lowercase and allow 3–32 ASCII letters, digits or underscores. Passwords are 12–128 UTF-16 code units (matching the browser), never trimmed. Argon2id uses 19 MiB, two iterations and one lane with random salts. Sessions use random 256-bit tokens, only SHA-256 token hashes in PostgreSQL, seven-day expiration, HttpOnly/SameSite=Strict cookies, and rotation on login. Authentication is limited to 30 requests per peer IP and 10 per username per ten minutes. The limiter is process-local; restart resets it, and local Vite users share one peer IP. Public/multi-instance deployment requires revisiting this limiter.

## Frontend behavior

The centered hero shares the existing sky artwork. The journal renders its own keyboard-accessible calendar and sky dropdown, and uses styled inline validation instead of browser validation dialogs. Telescope/optics and camera are recorded separately; an optional coordinate switch reveals signed decimal latitude and longitude. Seeing, cloud cover and relative humidity remain optional, are persisted with each observation, and appear in the record detail and JSON export.

The auth gate restores the session before mounting a diary. Logout unmounts records, drafts and dialogs immediately; a failed server logout shows a retry screen rather than claiming success. An expired session returns to login. Pending reads are aborted and late writes ignored when the diary unmounts.

Loading, empty and failed requests are distinct. A failed save preserves the form. Buttons block repeated submissions while requests are pending. Fictional examples appear only after a successful empty response; they are never persisted, counted or exported. Search/filter/export operate on the full loaded user archive in this version. Backend records survive clearing browser storage. Earlier browser diaries remain untouched and are neither imported nor read.

See [the frontend guide](frontend/README.md) for visual customization and the bundled background video.

## Validation and IDE runs

```sh
./scripts/backend.sh scalafmtCheckAll test
cd frontend
npm run build
npm run format:check
```

Backend tests use real PostgreSQL, rerun migrations, and cover validation, two-user isolation, duplicate registration, password checks, CSRF, server persistence, session expiration, logout and rate limits. Tests clean up only their randomly named accounts; they refuse the normal application database.

For IntelliJ, select JDK 21 (Homebrew path: `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`) and import `build.sbt`. Shared Shell Script run configurations in `.run/` invoke the backend wrapper or Vite from the correct working directory. Alternatively run `deepsky.Main` with the variables from `.env.local`; never commit credentials into a run configuration.

## Backup and restore

Use PostgreSQL backups for all accounts; the UI JSON export only covers the signed-in user's observations. Store backup files privately.

```sh
set -a
source .env.local
set +a
PGPASSWORD="$DB_PASSWORD" /opt/homebrew/opt/postgresql@18/bin/pg_dump \
  -h 127.0.0.1 -U "$DB_USER" -d deep_sky -Fc -f .local/deep-sky-backup.dump
```

To test recovery, create a new database owned by `deep_sky`, then run `pg_restore --no-owner --no-acl` into that empty database. Change `DB_URL` to the restored database and restart the API. Do not restore over the active database. Keep existing migration history in the backup.
