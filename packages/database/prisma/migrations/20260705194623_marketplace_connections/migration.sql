-- CreateEnum
CREATE TYPE "MarketplacePlatform" AS ENUM ('TRENDYOL_GO', 'GETIR');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "meta" JSONB;

-- CreateTable
CREATE TABLE "MarketplaceConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "platform" "MarketplacePlatform" NOT NULL,
    "supplierId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "storeId" TEXT,
    "executorEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPolledAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceProductMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT '',
    "platform" "MarketplacePlatform" NOT NULL,
    "platformProductId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "platformProductName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceConnection_tenantId_idx" ON "MarketplaceConnection"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConnection_tenantId_platform_key" ON "MarketplaceConnection"("tenantId", "platform");

-- CreateIndex
CREATE INDEX "MarketplaceProductMapping_tenantId_idx" ON "MarketplaceProductMapping"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProductMapping_tenantId_platform_platformProduct_key" ON "MarketplaceProductMapping"("tenantId", "platform", "platformProductId");

-- AddForeignKey
ALTER TABLE "MarketplaceConnection" ADD CONSTRAINT "MarketplaceConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProductMapping" ADD CONSTRAINT "MarketplaceProductMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProductMapping" ADD CONSTRAINT "MarketplaceProductMapping_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- RLS backstop — yeni tenant tablolarına izolasyon policy'si
-- (20260704160000_rls_tenant_isolation ile aynı kalıp; GRANT'ler default
--  privileges'tan geliyor, tekrar gerekmez)
-- ============================================================================

ALTER TABLE "MarketplaceConnection" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "MarketplaceConnection";
CREATE POLICY tenant_isolation ON "MarketplaceConnection"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

ALTER TABLE "MarketplaceProductMapping" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "MarketplaceProductMapping";
CREATE POLICY tenant_isolation ON "MarketplaceProductMapping"
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));
