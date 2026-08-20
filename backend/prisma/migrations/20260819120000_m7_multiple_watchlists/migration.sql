-- Add `name` column to watchlists and convert unique constraint to (userId, name)

ALTER TABLE "watchlists" ADD COLUMN IF NOT EXISTS "name" VARCHAR(100) NOT NULL DEFAULT 'Default';

-- Drop the old unique index on userId (if present)
DROP INDEX IF EXISTS "watchlists_userId_key";

-- Create an index on userId for faster lookups
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind = 'i' AND c.relname = 'watchlists_userId_idx') THEN
        CREATE INDEX "watchlists_userId_idx" ON "watchlists"("userId");
    END IF;
END$$;

-- Create a unique constraint per (userId, name)
CREATE UNIQUE INDEX IF NOT EXISTS "watchlists_userId_name_key" ON "watchlists"("userId", "name");
