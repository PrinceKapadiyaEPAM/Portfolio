-- AlterTable
ALTER TABLE "holdings" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "holding_sales" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "qty" DECIMAL(18,4) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "charges" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "pnl" DECIMAL(18,4),
    "notes" VARCHAR(255),
    "executedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holding_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "holding_sales_holdingId_idx" ON "holding_sales"("holdingId");

-- AddForeignKey
ALTER TABLE "holding_sales" ADD CONSTRAINT "holding_sales_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "holdings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
