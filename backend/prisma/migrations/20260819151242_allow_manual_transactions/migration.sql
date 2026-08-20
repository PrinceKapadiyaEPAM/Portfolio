-- DropForeignKey
ALTER TABLE "trade_transactions" DROP CONSTRAINT "trade_transactions_tradeSetupId_fkey";

-- AlterTable
ALTER TABLE "trade_transactions" ALTER COLUMN "tradeSetupId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_tradeSetupId_fkey" FOREIGN KEY ("tradeSetupId") REFERENCES "trade_setups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
