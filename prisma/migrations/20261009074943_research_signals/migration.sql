-- AlterTable
ALTER TABLE "security_research" ADD COLUMN     "analystTargetManual" DECIMAL(20,4);

-- CreateTable
CREATE TABLE "security_analyst_data" (
    "securityId" TEXT NOT NULL,
    "targetPrice" DECIMAL(20,4),
    "strongBuy" INTEGER,
    "buy" INTEGER,
    "hold" INTEGER,
    "sell" INTEGER,
    "strongSell" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_analyst_data_pkey" PRIMARY KEY ("securityId")
);

-- AddForeignKey
ALTER TABLE "security_analyst_data" ADD CONSTRAINT "security_analyst_data_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
