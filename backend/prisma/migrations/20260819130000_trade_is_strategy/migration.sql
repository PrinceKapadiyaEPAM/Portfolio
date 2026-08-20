-- Drop strategy foreign key from trade_setups
ALTER TABLE "trade_setups" DROP CONSTRAINT IF EXISTS "trade_setups_strategyId_fkey";

-- Drop strategyId index
DROP INDEX IF EXISTS "trade_setups_strategyId_idx";

-- Add name and description columns with a default for existing rows
ALTER TABLE "trade_setups" ADD COLUMN "name" VARCHAR(100) NOT NULL DEFAULT 'Untitled';
ALTER TABLE "trade_setups" ADD COLUMN "description" TEXT;

-- Remove the default constraint now that existing rows are populated
ALTER TABLE "trade_setups" ALTER COLUMN "name" DROP DEFAULT;

-- Drop strategyId column
ALTER TABLE "trade_setups" DROP COLUMN IF EXISTS "strategyId";

-- Add User foreign key to trade_setups
ALTER TABLE "trade_setups" ADD CONSTRAINT "trade_setups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop strategies table
DROP TABLE IF EXISTS "strategies";
