-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'SUPERVISOR', 'TEACHER', 'COORDENATOR', 'PRINCIPAL', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "public"."Contract" AS ENUM ('CLT', 'PJ');

-- CreateEnum
CREATE TYPE "public"."TeacherFunctions" AS ENUM ('HTCP', 'SUPERVISOR', 'SOCIAL_DEMAND');

-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED');

-- CreateEnum
CREATE TYPE "public"."ProgramType" AS ENUM ('SPORTS', 'OLYMPICS');

-- CreateEnum
CREATE TYPE "public"."AssessmentType" AS ENUM ('TEST', 'ASSIGNMENT', 'QUIZ', 'FINAL');

-- CreateEnum
CREATE TYPE "public"."AgentType" AS ENUM ('SECRETARIA', 'SDR', 'POS_VENDA', 'SUPORTE_TECNICO', 'VENDEDOR', 'FINANCEIRO', 'LOGISTICA', 'RH');

-- CreateEnum
CREATE TYPE "public"."AgentStatus" AS ENUM ('ATIVO', 'PAUSADO', 'RASCUNHO');

-- CreateEnum
CREATE TYPE "public"."RuleKind" AS ENUM ('MAIN', 'COND', 'FALLBACK');

-- CreateEnum
CREATE TYPE "public"."Channel" AS ENUM ('WHATSAPP', 'WEB', 'INSTAGRAM', 'TELEFONE', 'EMAIL', 'TELEGRAM', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."Scholarship" AS ENUM ('SPORTS', 'RESEARCH', 'SOCIAL_DEMAND', 'MERIT', 'CONTEST');

-- CreateEnum
CREATE TYPE "public"."Relation" AS ENUM ('PAI', 'AVÔ', 'AVÓ', 'MAE', 'BABA');

-- CreateEnum
CREATE TYPE "public"."Agreement" AS ENUM ('NONE', 'STAR', 'GREYHOUND', 'MONEYSAVER');

-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('STANDART', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "public"."PayStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."PayMethod" AS ENUM ('PIX', 'BOLETO', 'CARTAO');

-- CreateEnum
CREATE TYPE "public"."BoletoStatus" AS ENUM ('PAIED', 'PENDENT', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."SpacesType" AS ENUM ('ROOM', 'MULTISPOSTS', 'INFOLAB', 'CIENCLAB', 'DEBATEROOM');

-- CreateEnum
CREATE TYPE "public"."MessageSender" AS ENUM ('USER', 'CLIENT', 'AGENT_IA');

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
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAte" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "contract" "public"."Contract" NOT NULL,
    "workload" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teacher" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "functions" "public"."TeacherFunctions"[],

    CONSTRAINT "teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "public"."AttendanceStatus" NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assessment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."AssessmentType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."grade" (
    "id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "studentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."students_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "descript" TEXT NOT NULL,
    "type" "public"."ProgramType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."student_programs_registers" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "role" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_programs_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupervisorConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nome" TEXT NOT NULL DEFAULT 'Supervisor',
    "online" BOOLEAN NOT NULL DEFAULT false,
    "instrucoes" TEXT,
    "slaMin" INTEGER NOT NULL DEFAULT 5,
    "fallbackAtivo" BOOLEAN NOT NULL DEFAULT true,
    "horariosJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Agent" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "public"."AgentType" NOT NULL,
    "status" "public"."AgentStatus" NOT NULL DEFAULT 'ATIVO',
    "persona" TEXT,
    "herdaPersonaDoPai" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "saude" TEXT,
    "parentId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentChannel" (
    "agentId" TEXT NOT NULL,
    "channel" "public"."Channel" NOT NULL,
    "primary" BOOLEAN,
    "handle" TEXT,

    CONSTRAINT "AgentChannel_pkey" PRIMARY KEY ("agentId","channel")
);

-- CreateTable
CREATE TABLE "public"."AgentTag" (
    "id" SERIAL NOT NULL,
    "agentId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "AgentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamMember" (
    "id" SERIAL NOT NULL,
    "teamId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "pos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Rule" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "deId" TEXT NOT NULL,
    "paraId" TEXT NOT NULL,
    "tipo" "public"."RuleKind" NOT NULL,
    "condicao" TEXT,
    "ordem" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrainingJob" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "meta" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."students" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "birth" TEXT NOT NULL,
    "scholarship" "public"."Scholarship" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sponsor" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "birth" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL,

    CONSTRAINT "sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."responsibles" (
    "studentId" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "relation" "public"."Relation" NOT NULL,

    CONSTRAINT "responsibles_pkey" PRIMARY KEY ("studentId","sponsorId")
);

-- CreateTable
CREATE TABLE "public"."students_documents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "students_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sponsor_documents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sponsorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."registration" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "isFirstRegistration" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."school_records" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "average" DOUBLE PRECISION,
    "status" TEXT,
    "notes" TEXT,
    "filePath" TEXT,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transference" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plans" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "plan" "public"."Plan" NOT NULL,
    "agreement" "public"."Agreement" DEFAULT 'NONE',
    "negotiation" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."PayStatus" NOT NULL,
    "method" "public"."PayMethod",
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "planId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."boletos" (
    "id" TEXT NOT NULL,
    "typedLine" TEXT NOT NULL,
    "expiredIn" TIMESTAMP(3) NOT NULL,
    "status" "public"."BoletoStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boletos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."uniforms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "descript" TEXT,
    "quantity" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uniforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders_uniforms" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "uniformId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."SpacesType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schedule_space" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_numbers" (
    "id" TEXT NOT NULL,
    "number" TEXT,
    "userId" TEXT NOT NULL,
    "instance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" TEXT NOT NULL,
    "remoteJid" TEXT,
    "message" TEXT,
    "sendAt" TIMESTAMP(3),
    "messageId" TEXT,
    "fromMe" BOOLEAN,
    "pushName" TEXT,
    "instance" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "public"."employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_employeeId_key" ON "public"."teacher"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "subject_teacherId_key" ON "public"."subject"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_studentId_subjectId_date_key" ON "public"."attendance"("studentId", "subjectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "grade_studentId_assessmentId_key" ON "public"."grade"("studentId", "assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "student_programs_registers_studentId_programId_key" ON "public"."student_programs_registers"("studentId", "programId");

-- CreateIndex
CREATE INDEX "Agent_parentId_idx" ON "public"."Agent"("parentId");

-- CreateIndex
CREATE INDEX "Agent_tipo_idx" ON "public"."Agent"("tipo");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "public"."Agent"("status");

-- CreateIndex
CREATE INDEX "Agent_ownerId_idx" ON "public"."Agent"("ownerId");

-- CreateIndex
CREATE INDEX "AgentChannel_channel_idx" ON "public"."AgentChannel"("channel");

-- CreateIndex
CREATE INDEX "AgentTag_tag_idx" ON "public"."AgentTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTag_agentId_tag_key" ON "public"."AgentTag"("agentId", "tag");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_pos_idx" ON "public"."TeamMember"("teamId", "pos");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_agentId_key" ON "public"."TeamMember"("teamId", "agentId");

-- CreateIndex
CREATE INDEX "Rule_teamId_idx" ON "public"."Rule"("teamId");

-- CreateIndex
CREATE INDEX "Rule_deId_idx" ON "public"."Rule"("deId");

-- CreateIndex
CREATE INDEX "Rule_paraId_idx" ON "public"."Rule"("paraId");

-- CreateIndex
CREATE INDEX "TrainingJob_agentId_status_idx" ON "public"."TrainingJob"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "responsibles_sponsorId_key" ON "public"."responsibles"("sponsorId");

-- CreateIndex
CREATE INDEX "agent_documents_agentId_idx" ON "public"."agent_documents"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_studentId_key" ON "public"."registration"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_responsibleId_key" ON "public"."registration"("responsibleId");

-- CreateIndex
CREATE UNIQUE INDEX "transference_studentId_key" ON "public"."transference"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_sponsorId_key" ON "public"."plans"("sponsorId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_uniforms_sponsorId_key" ON "public"."orders_uniforms"("sponsorId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_uniforms_uniformId_key" ON "public"."orders_uniforms"("uniformId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_space_studentId_key" ON "public"."schedule_space"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_space_spaceId_key" ON "public"."schedule_space"("spaceId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_numbers_userId_key" ON "public"."whatsapp_numbers"("userId");

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teacher" ADD CONSTRAINT "teacher_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subject" ADD CONSTRAINT "subject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "public"."teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance" ADD CONSTRAINT "attendance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessment" ADD CONSTRAINT "assessment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grade" ADD CONSTRAINT "grade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."grade" ADD CONSTRAINT "grade_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_programs_registers" ADD CONSTRAINT "student_programs_registers_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_programs_registers" ADD CONSTRAINT "student_programs_registers_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."students_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Agent" ADD CONSTRAINT "Agent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Agent" ADD CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentChannel" ADD CONSTRAINT "AgentChannel_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentTag" ADD CONSTRAINT "AgentTag_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rule" ADD CONSTRAINT "Rule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rule" ADD CONSTRAINT "Rule_deId_fkey" FOREIGN KEY ("deId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rule" ADD CONSTRAINT "Rule_paraId_fkey" FOREIGN KEY ("paraId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrainingJob" ADD CONSTRAINT "TrainingJob_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."responsibles" ADD CONSTRAINT "responsibles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."responsibles" ADD CONSTRAINT "responsibles_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students_documents" ADD CONSTRAINT "students_documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sponsor_documents" ADD CONSTRAINT "sponsor_documents_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_documents" ADD CONSTRAINT "agent_documents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."registration" ADD CONSTRAINT "registration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."registration" ADD CONSTRAINT "registration_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "public"."responsibles"("sponsorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."school_records" ADD CONSTRAINT "school_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transference" ADD CONSTRAINT "transference_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plans" ADD CONSTRAINT "plans_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders_uniforms" ADD CONSTRAINT "orders_uniforms_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders_uniforms" ADD CONSTRAINT "orders_uniforms_uniformId_fkey" FOREIGN KEY ("uniformId") REFERENCES "public"."uniforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_space" ADD CONSTRAINT "schedule_space_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."schedule_space" ADD CONSTRAINT "schedule_space_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "public"."Spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_numbers" ADD CONSTRAINT "whatsapp_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
