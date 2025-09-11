ALTER TABLE "Team" ADD COLUMN "name" TEXT;
ALTER TABLE "Team" ADD COLUMN "tenantId" TEXT;
UPDATE "Team" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
ALTER TABLE "Team" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Team" ADD CONSTRAINT "Team_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Team_tenantId_idx" ON "Team"("tenantId");

ALTER TABLE "TeamMember" ADD COLUMN "tenantId" TEXT;
UPDATE "TeamMember" SET "tenantId" = 'default-tenant' WHERE "tenantId" IS NULL;
ALTER TABLE "TeamMember" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "TeamMember_tenantId_idx" ON "TeamMember"("tenantId");
