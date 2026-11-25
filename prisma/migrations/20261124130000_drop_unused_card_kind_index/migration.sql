-- The vocab tabs filter client-side, so no query reads (userId, kind); the
-- index only adds write cost to every card create and review update.
DROP INDEX "UserFlashcard_userId_kind_idx";
