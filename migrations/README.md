# Migrations

Each `.sql` file in this folder is applied once, in alphabetical order, by `scripts/migrate.mjs`.

The runner stores applied filenames in `schema_migrations`.

To run migrations:

```bash
pnpm migrate
```