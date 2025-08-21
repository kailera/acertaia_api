/*
  Warnings:

  - Added the required column `instance` to the `whatsapp_numbers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."whatsapp_numbers" ADD COLUMN     "instance" TEXT NOT NULL;
