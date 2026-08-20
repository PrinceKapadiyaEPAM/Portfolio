-- CreateTable
CREATE TABLE "daily_prices" (
    "id" TEXT NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "date" DATE NOT NULL,
    "closePrice" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "daily_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_prices_symbol_idx" ON "daily_prices"("symbol");

-- CreateIndex
CREATE INDEX "daily_prices_date_idx" ON "daily_prices"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_prices_symbol_date_key" ON "daily_prices"("symbol", "date");
