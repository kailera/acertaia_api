/*
  Warnings:

  - You are about to drop the column `mimeType` on the `agent_documents` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `agent_documents` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `agent_documents` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[agentId,documentId,role]` on the table `agent_documents` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `documentId` to the `agent_documents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."DocKind" AS ENUM ('SCRIPT', 'CSV', 'MEDIA', 'RULE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."AgentDocRole" AS ENUM ('PRIMARY', 'EXTRA', 'CSV', 'MEDIA', 'RULE_OVERRIDE');

-- AlterTable
ALTER TABLE "public"."agent_documents" DROP COLUMN "mimeType",
DROP COLUMN "name",
DROP COLUMN "url",
ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "documentId" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "role" "public"."AgentDocRole";

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "public"."DocKind" NOT NULL,
    "mimeType" TEXT,
    "url" TEXT,
    "body" TEXT,
    "tags" JSONB,
    "meta" JSONB,
    "status" TEXT,
    "perm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_ownerId_idx" ON "public"."Document"("ownerId");

-- CreateIndex
CREATE INDEX "Document_kind_idx" ON "public"."Document"("kind");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "public"."Document"("status");

-- CreateIndex
CREATE INDEX "agent_documents_documentId_idx" ON "public"."agent_documents"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_documents_agentId_documentId_role_key" ON "public"."agent_documents"("agentId", "documentId", "role");

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_documents" ADD CONSTRAINT "agent_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
