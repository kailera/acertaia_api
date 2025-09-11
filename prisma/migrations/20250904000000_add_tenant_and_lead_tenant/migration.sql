-- AlterTable
ALTER TABLE "tenant" ADD COLUMN "slug" TEXT;
UPDATE "tenant" SET "slug" = 'default' WHERE "slug" IS NULL;
ALTER TABLE "tenant" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");
ALTER TABLE "tenant" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tenant" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for existing tables
CREATE INDEX "user_tenantId_idx" ON "user"("tenantId");
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");

-- AlterTable Lead to add tenant segregation
ALTER TABLE "Lead" ADD COLUMN "tenantId" TEXT;
UPDATE "Lead" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
ALTER TABLE "Lead" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");
