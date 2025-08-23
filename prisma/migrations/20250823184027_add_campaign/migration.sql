-- CreateEnum
CREATE TYPE "public"."Channel" AS ENUM ('META', 'GOOGLE', 'QR', 'KEYWORD', 'LANDING_PAGE');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "public"."Persona" AS ENUM ('REGULAR', 'INTEGRAL', 'BILINGUE');

-- CreateEnum
CREATE TYPE "public"."Interest" AS ENUM ('REGULAR', 'INTEGRAL', 'BILINGUE');

-- CreateEnum
CREATE TYPE "public"."ContentType" AS ENUM ('VIDEO', 'AUDIO', 'LINK', 'DOCUMENT', 'GUIDE');

-- CreateEnum
CREATE TYPE "public"."InteractionType" AS ENUM ('MESSAGE_SENT', 'MATERIAL_SENT', 'CLICK', 'FORM_SUBMITTED');

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "public"."Channel" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "persona" "public"."Persona",
    "series" TEXT,
    "interest" "public"."Interest",
    "utmSource" TEXT,
    "utmCampaign" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."ContentType" NOT NULL,
    "url" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "campaignId" TEXT NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Interaction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "contentId" TEXT,
    "type" "public"."InteractionType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignReport" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "ctr" DOUBLE PRECISION,
    "cvr" DOUBLE PRECISION,
    "cpl" DOUBLE PRECISION,
    "lql" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION,
    "cac" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Content" ADD CONSTRAINT "Content_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interaction" ADD CONSTRAINT "Interaction_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "public"."Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignReport" ADD CONSTRAINT "CampaignReport_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
