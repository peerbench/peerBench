-- CreateTable
CREATE TABLE "tst_supabase_discovery_cache" (
    "id" UUID NOT NULL,
    "hostname" TEXT NOT NULL,
    "supabase_url" TEXT NOT NULL,
    "supabase_api_key" TEXT NOT NULL,
    "strategy_used" TEXT NOT NULL,
    "discovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_supabase_discovery_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tst_supabase_discovery_cache_hostname_key" ON "tst_supabase_discovery_cache"("hostname");
