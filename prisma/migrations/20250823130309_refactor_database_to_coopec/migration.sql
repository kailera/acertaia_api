/*
  Warnings:

  - The values [SUPERVISOR_TENANT] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `businessSubscriptionId` on the `agents` table. All the data in the column will be lost.
  - You are about to drop the column `businessSubscriptionId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `Contacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `business_subscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documents` table. If the table is not empty, all the data it contains will be lost.

*/
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

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Role_new" AS ENUM ('USER', 'SUPERVISOR', 'TEACHER', 'COORDENATOR', 'PRINCIPAL', 'ADMIN', 'SUPERADMIN');
ALTER TABLE "public"."user" ALTER COLUMN "role" TYPE "public"."Role_new" USING ("role"::text::"public"."Role_new");
ALTER TYPE "public"."Role" RENAME TO "Role_old";
ALTER TYPE "public"."Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Contacts" DROP CONSTRAINT "Contacts_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."agents" DROP CONSTRAINT "agents_businessSubscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."documents" DROP CONSTRAINT "documents_agentiaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user" DROP CONSTRAINT "user_businessSubscriptionId_fkey";

-- AlterTable
ALTER TABLE "public"."agents" DROP COLUMN "businessSubscriptionId";

-- AlterTable
ALTER TABLE "public"."user" DROP COLUMN "businessSubscriptionId";

-- DropTable
DROP TABLE "public"."Contacts";

-- DropTable
DROP TABLE "public"."Messages";

-- DropTable
DROP TABLE "public"."business_subscription";

-- DropTable
DROP TABLE "public"."documents";

-- DropEnum
DROP TYPE "public"."SubscriptionsPlans";

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
    "agentiaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

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
    "message" TEXT NOT NULL,
    "sender" "public"."MessageSender" NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "responsibles_sponsorId_key" ON "public"."responsibles"("sponsorId");

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
ALTER TABLE "public"."responsibles" ADD CONSTRAINT "responsibles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."responsibles" ADD CONSTRAINT "responsibles_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students_documents" ADD CONSTRAINT "students_documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sponsor_documents" ADD CONSTRAINT "sponsor_documents_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "public"."sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_documents" ADD CONSTRAINT "agent_documents_agentiaId_fkey" FOREIGN KEY ("agentiaId") REFERENCES "public"."agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
