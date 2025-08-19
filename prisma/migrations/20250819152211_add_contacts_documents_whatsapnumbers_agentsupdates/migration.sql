/*
  Warnings:

  - You are about to drop the column `updateAte` on the `documents` table. All the data in the column will be lost.
  - Added the required column `enableAudio` to the `agents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agentiaId` to the `documents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."MessageSender" AS ENUM ('USER', 'AGENT_IA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AgentIaTypes" ADD VALUE 'LOGISTIC';
ALTER TYPE "public"."AgentIaTypes" ADD VALUE 'FINANCES';

-- AlterTable
ALTER TABLE "public"."agents" ADD COLUMN     "enableAudio" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "public"."documents" DROP COLUMN "updateAte",
ADD COLUMN     "agentiaId" TEXT NOT NULL,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "public"."whatsapp_numbers" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Messages" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sender" "public"."MessageSender" NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_agentiaId_fkey" FOREIGN KEY ("agentiaId") REFERENCES "public"."agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_numbers" ADD CONSTRAINT "whatsapp_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contacts" ADD CONSTRAINT "Contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
