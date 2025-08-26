-- AlterEnum
CREATE TYPE "public"."AgentIaTypes_new" AS ENUM ('SECRETARY', 'FINANCE', 'SDR', 'LOGISTIC');
ALTER TABLE "public"."agents" ALTER COLUMN "type" TYPE "public"."AgentIaTypes_new" USING ("type"::text::"public"."AgentIaTypes_new");
DROP TYPE "public"."AgentIaTypes";
ALTER TYPE "public"."AgentIaTypes_new" RENAME TO "AgentIaTypes";
