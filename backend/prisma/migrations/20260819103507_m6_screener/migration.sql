-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" TEXT NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "ltp" DECIMAL(18,4) NOT NULL,
    "changePct" DECIMAL(10,4) NOT NULL,
    "volume" BIGINT NOT NULL,
    "week52High" DECIMAL(18,4),
    "week52Low" DECIMAL(18,4),
    "perChange365d" DECIMAL(10,4),
    "snappedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screener_presets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screener_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_snapshots_symbol_key" ON "market_snapshots"("symbol");

-- CreateIndex
CREATE INDEX "market_snapshots_changePct_idx" ON "market_snapshots"("changePct");

-- CreateIndex
CREATE INDEX "market_snapshots_volume_idx" ON "market_snapshots"("volume");

-- CreateIndex
CREATE INDEX "screener_presets_userId_idx" ON "screener_presets"("userId");

-- CreateIndex
CREATE INDEX "screener_presets_orgId_idx" ON "screener_presets"("orgId");
