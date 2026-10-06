-- CreateEnum
CREATE TYPE "SecurityType" AS ENUM ('STOCK', 'ETF');

-- CreateEnum
CREATE TYPE "SnapshotSource" AS ENUM ('TICKERTAPE_CSV');

-- CreateEnum
CREATE TYPE "Conviction" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('WATCH', 'ACCUMULATE', 'HOLD', 'REDUCE', 'EXIT');

-- CreateEnum
CREATE TYPE "ImportSessionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "securities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "type" "SecurityType" NOT NULL,
    "exchange" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "tickertapeTicker" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "securities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_aliases" (
    "id" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "source" "SnapshotSource" NOT NULL DEFAULT 'TICKERTAPE_CSV',
    "fileName" TEXT,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshot_holdings" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "averageBuyPrice" DECIMAL(20,4) NOT NULL,
    "investedAmount" DECIMAL(20,4) NOT NULL,
    "currentPrice" DECIMAL(20,4) NOT NULL,
    "currentValue" DECIMAL(20,4) NOT NULL,
    "weight" DECIMAL(9,4) NOT NULL,
    "pnlAmount" DECIMAL(20,4) NOT NULL,
    "pnlPercentage" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshot_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_research" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "securityId" TEXT NOT NULL,
    "thesis" TEXT,
    "whyBought" TEXT,
    "bullCase" TEXT,
    "baseCase" TEXT,
    "bearCase" TEXT,
    "businessDescription" TEXT,
    "targetPrice" DECIMAL(20,4),
    "accumulationMin" DECIMAL(20,4),
    "accumulationMax" DECIMAL(20,4),
    "stopPrice" DECIMAL(20,4),
    "expectedHoldingPeriod" TEXT,
    "conviction" "Conviction",
    "investmentStatus" "InvestmentStatus",
    "risks" TEXT,
    "personalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_research_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_tags" (
    "securityId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_tags_pkey" PRIMARY KEY ("securityId","tagId")
);

-- CreateTable
CREATE TABLE "import_sessions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "ImportSessionStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "snapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "securities_type_idx" ON "securities"("type");

-- CreateIndex
CREATE UNIQUE INDEX "securities_country_ticker_key" ON "securities"("country", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "security_aliases_normalizedName_key" ON "security_aliases"("normalizedName");

-- CreateIndex
CREATE INDEX "security_aliases_securityId_idx" ON "security_aliases"("securityId");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_profileId_snapshotDate_idx" ON "portfolio_snapshots"("profileId", "snapshotDate");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_profileId_contentHash_idx" ON "portfolio_snapshots"("profileId", "contentHash");

-- CreateIndex
CREATE INDEX "snapshot_holdings_securityId_idx" ON "snapshot_holdings"("securityId");

-- CreateIndex
CREATE UNIQUE INDEX "snapshot_holdings_snapshotId_securityId_key" ON "snapshot_holdings"("snapshotId", "securityId");

-- CreateIndex
CREATE INDEX "security_research_securityId_idx" ON "security_research"("securityId");

-- CreateIndex
CREATE UNIQUE INDEX "security_research_profileId_securityId_key" ON "security_research"("profileId", "securityId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_profileId_name_key" ON "tags"("profileId", "name");

-- CreateIndex
CREATE INDEX "security_tags_tagId_idx" ON "security_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "import_sessions_snapshotId_key" ON "import_sessions"("snapshotId");

-- CreateIndex
CREATE INDEX "import_sessions_profileId_status_idx" ON "import_sessions"("profileId", "status");

-- AddForeignKey
ALTER TABLE "security_aliases" ADD CONSTRAINT "security_aliases_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_holdings" ADD CONSTRAINT "snapshot_holdings_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "portfolio_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snapshot_holdings" ADD CONSTRAINT "snapshot_holdings_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_research" ADD CONSTRAINT "security_research_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_research" ADD CONSTRAINT "security_research_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_tags" ADD CONSTRAINT "security_tags_securityId_fkey" FOREIGN KEY ("securityId") REFERENCES "securities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_tags" ADD CONSTRAINT "security_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "portfolio_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
