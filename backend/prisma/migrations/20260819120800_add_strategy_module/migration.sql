-- AlterTable
ALTER TABLE "watchlists" ALTER COLUMN "name" DROP DEFAULT;

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_setups" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tradeId" VARCHAR(30) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "buyRangeHigh" DECIMAL(18,4) NOT NULL,
    "buyRangeLow" DECIMAL(18,4) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "slType" VARCHAR(10),
    "slReference" VARCHAR(50),
    "slValue" DECIMAL(18,4),
    "slStatus" VARCHAR(20),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accumulation_levels" (
    "id" TEXT NOT NULL,
    "tradeSetupId" TEXT NOT NULL,
    "levelNum" INTEGER NOT NULL,
    "triggerPrice" DECIMAL(18,4) NOT NULL,
    "plannedQty" DECIMAL(18,4) NOT NULL,
    "executedQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "executedPrice" DECIMAL(18,4),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accumulation_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_targets" (
    "id" TEXT NOT NULL,
    "tradeSetupId" TEXT NOT NULL,
    "levelNum" INTEGER NOT NULL,
    "targetPrice" DECIMAL(18,4) NOT NULL,
    "plannedQty" DECIMAL(18,4),
    "plannedPct" DECIMAL(8,4),
    "executedQty" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "executedPrice" DECIMAL(18,4),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_transactions" (
    "id" TEXT NOT NULL,
    "tradeSetupId" TEXT NOT NULL,
    "accumulationLevelId" TEXT,
    "targetId" TEXT,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "txnRef" VARCHAR(30) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "side" VARCHAR(4) NOT NULL,
    "qty" DECIMAL(18,4) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "txnType" VARCHAR(20) NOT NULL,
    "charges" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "pnl" DECIMAL(18,4),
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "strategies_userId_idx" ON "strategies"("userId");

-- CreateIndex
CREATE INDEX "strategies_orgId_idx" ON "strategies"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_userId_name_key" ON "strategies"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "trade_setups_tradeId_key" ON "trade_setups"("tradeId");

-- CreateIndex
CREATE INDEX "trade_setups_strategyId_idx" ON "trade_setups"("strategyId");

-- CreateIndex
CREATE INDEX "trade_setups_userId_idx" ON "trade_setups"("userId");

-- CreateIndex
CREATE INDEX "trade_setups_orgId_idx" ON "trade_setups"("orgId");

-- CreateIndex
CREATE INDEX "trade_setups_symbol_idx" ON "trade_setups"("symbol");

-- CreateIndex
CREATE INDEX "accumulation_levels_tradeSetupId_idx" ON "accumulation_levels"("tradeSetupId");

-- CreateIndex
CREATE UNIQUE INDEX "accumulation_levels_tradeSetupId_levelNum_key" ON "accumulation_levels"("tradeSetupId", "levelNum");

-- CreateIndex
CREATE INDEX "trade_targets_tradeSetupId_idx" ON "trade_targets"("tradeSetupId");

-- CreateIndex
CREATE UNIQUE INDEX "trade_targets_tradeSetupId_levelNum_key" ON "trade_targets"("tradeSetupId", "levelNum");

-- CreateIndex
CREATE UNIQUE INDEX "trade_transactions_txnRef_key" ON "trade_transactions"("txnRef");

-- CreateIndex
CREATE INDEX "trade_transactions_tradeSetupId_idx" ON "trade_transactions"("tradeSetupId");

-- CreateIndex
CREATE INDEX "trade_transactions_userId_idx" ON "trade_transactions"("userId");

-- CreateIndex
CREATE INDEX "trade_transactions_orgId_idx" ON "trade_transactions"("orgId");

-- CreateIndex
CREATE INDEX "trade_transactions_symbol_idx" ON "trade_transactions"("symbol");

-- CreateIndex
CREATE INDEX "trade_transactions_executedAt_idx" ON "trade_transactions"("executedAt");

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_setups" ADD CONSTRAINT "trade_setups_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accumulation_levels" ADD CONSTRAINT "accumulation_levels_tradeSetupId_fkey" FOREIGN KEY ("tradeSetupId") REFERENCES "trade_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_targets" ADD CONSTRAINT "trade_targets_tradeSetupId_fkey" FOREIGN KEY ("tradeSetupId") REFERENCES "trade_setups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_tradeSetupId_fkey" FOREIGN KEY ("tradeSetupId") REFERENCES "trade_setups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_accumulationLevelId_fkey" FOREIGN KEY ("accumulationLevelId") REFERENCES "accumulation_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "trade_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_transactions" ADD CONSTRAINT "trade_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
