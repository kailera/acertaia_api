-- Added values to enum "Channel"
ALTER TYPE "Channel" ADD VALUE IF NOT EXISTS 'META';
ALTER TYPE "Channel" ADD VALUE IF NOT EXISTS 'GOOGLE';
ALTER TYPE "Channel" ADD VALUE IF NOT EXISTS 'QR_CODE';

-- Create enum types
CREATE TYPE "CampaignStatus" AS ENUM ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "LeadStage" AS ENUM ('CONTACTED', 'QUALIFIED', 'SCHEDULED', 'WON', 'LOST');

-- Rename enum and table for LeadInteraction
ALTER TYPE "InteractionType" RENAME TO "LeadInteractionType";
ALTER TABLE "Interaction" RENAME TO "LeadInteraction";

-- Alter Campaign table
ALTER TABLE "Campaign"
    ADD COLUMN "origin" TEXT,
    ADD COLUMN "status" "CampaignStatus" NOT NULL DEFAULT 'PLANNED',
    ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    DROP COLUMN "active";
ALTER TABLE "Campaign" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "Campaign"
    ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Alter Lead table
ALTER TABLE "Lead"
    ADD COLUMN "contactId" TEXT,
    ADD COLUMN "teamId" TEXT,
    ADD COLUMN "assignedToId" TEXT,
    ADD COLUMN "stage" "LeadStage",
    ADD COLUMN "probability" DOUBLE PRECISION,
    ADD COLUMN "lastInteractionAt" TIMESTAMP(3);
ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "Lead_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
