-- CreateEnum
CREATE TYPE "public"."SubscriptionsPlans" AS ENUM ('PRO', 'PLUS', 'ADVANCED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'SUPERVISOR', 'SUPERVISOR_TENANT', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "public"."AgentIaTypes" AS ENUM ('ENDOMARKETING', 'HR', 'SDV', 'FILES');

-- CreateTable
CREATE TABLE "public"."business_subscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "plan" "public"."SubscriptionsPlans" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAte" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessSubscriptionId" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAte" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AgentIaTypes" NOT NULL,
    "personScript" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessSubscriptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAte" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAte" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."user" ADD CONSTRAINT "user_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "public"."business_subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agents" ADD CONSTRAINT "agents_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "public"."business_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
