-- CreateTable
CREATE TABLE "public"."conversation_agents" (
    "conversationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_agents_pkey" PRIMARY KEY ("conversationId")
);

-- CreateIndex
CREATE INDEX "conversation_agents_agentId_idx" ON "public"."conversation_agents"("agentId");

-- AddForeignKey
ALTER TABLE "public"."conversation_agents" ADD CONSTRAINT "conversation_agents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
