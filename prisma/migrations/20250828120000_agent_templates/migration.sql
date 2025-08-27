-- Alter AgentType enum to keep only relevant variants and add isTemplate column
CREATE TYPE "AgentType_new" AS ENUM ('SECRETARIA','FINANCEIRO','SDR','LOGISTICA');
ALTER TABLE "agent" ALTER COLUMN "tipo" TYPE "AgentType_new" USING ("tipo"::text::"AgentType_new");
DROP TYPE "AgentType";
ALTER TYPE "AgentType_new" RENAME TO "AgentType";

ALTER TABLE "agent" ADD COLUMN "isTemplate" BOOLEAN NOT NULL DEFAULT false;
