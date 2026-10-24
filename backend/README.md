# Aftertaste API

NestJS API for the catalog currently used by the frontend.

## Run locally

```bash
npm install
npm run start:dev
```

The API listens on port `3000` by default. Set `PORT` to change it and
`FRONTEND_ORIGIN` to a comma-separated list of allowed browser origins. The
default CORS setting allows local frontend development. PostgreSQL connection
is configured with `DATABASE_URL`; schema changes are stored in
`prisma/migrations` and applied automatically at production startup.

To run the complete app in Docker from the repository root, use
`docker compose up --build`. Open http://localhost:8080. The records are stored
in PostgreSQL in the `aftertaste-db` volume. The first backend startup imports
the previous JSON catalog from `DATA_DIR/entries.json` when that database is
empty; it keeps the original file as a backup.

To browse the database, open http://localhost:8081 in Adminer and use:

- System: PostgreSQL
- Server: `database`
- Database: `aftertaste`
- Username: `aftertaste`
- Password: `aftertaste-local`

Adminer is bound to localhost only. These default credentials are for local
development; replace them before exposing the app on a network.

## Catalog endpoints

- `GET /` — NestJS starter response.
- `GET /api/entries` — return the catalog.
- `POST /api/entries` — create a record.
- `PUT /api/entries/:id` — replace a record.
- `DELETE /api/entries/:id` — delete a record.
- `POST /api/entries/import` — one-time import; writes only when the server
  catalog is empty. The frontend uses this to migrate existing browser data.

Records use the frontend `Entry` shape, and photos remain data URLs inside each
record for now. This deployment has no accounts: it is intended for the current
single-user app and local development.
