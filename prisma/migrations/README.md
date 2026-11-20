# Migrations

## Current shape

- `000000000000_squashed_migrations` is the baseline. It represents the schema at
  the time of the July 2026 squash and must not be edited.
- The timestamped migrations after it are the linear history since that baseline.
- Every schema change gets a new timestamped folder. Never edit a migration that
  has already been applied anywhere; Prisma records its checksum.

## Database history cleanup (2026-11-21)

The live database's `_prisma_migrations` table had 29 rows: 12 current migrations,
16 rows from before the squashed baseline, and one rolled-back retry of
`20260927000000_kanji_primitives_folder_images`.

Only the 17 stale rows were removed. No schema SQL was run and no migration was
applied. A full copy of the old table is kept in the database as
`_prisma_migrations_backup_20261121` (29 rows); drop it once the cleanup has been
observed for a while.

`npx prisma migrate status` reports the database as up to date after the cleanup.

## Squashing again

Do not squash on a live database. A safe squash needs:

1. A disposable Postgres database and a backup of the target database.
2. A new baseline generated from `prisma/schema.prisma`.
3. `prisma migrate deploy` against the empty database, followed by
   `prisma migrate diff --from-url <empty-db> --to-schema-datamodel prisma/schema.prisma --exit-code`
   to prove the baseline reproduces the schema.
4. Deleting the old migration folders, then marking the new baseline applied on
   each existing environment with `prisma migrate resolve --applied`.
5. Pruning/archiving the old `_prisma_migrations` rows in the same maintenance
   window.

Never run `prisma migrate reset` against a shared or production database.

## CI

The current `npm run ci` checks lint, types and unit tests; it does not apply the
migration chain. A future CI job should start an ephemeral Postgres service, run
`prisma migrate deploy` from empty, and finish with the `prisma migrate diff`
check above.
