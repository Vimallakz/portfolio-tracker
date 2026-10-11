-- CreateTable
CREATE TABLE "benchmark_prices" (
    "symbol" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "close" DECIMAL(20,6) NOT NULL,

    CONSTRAINT "benchmark_prices_pkey" PRIMARY KEY ("symbol","date")
);

-- CreateTable
CREATE TABLE "benchmark_syncs" (
    "symbol" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmark_syncs_pkey" PRIMARY KEY ("symbol")
);
