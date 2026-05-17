-- CreateEnum
CREATE TYPE "Instituicao" AS ENUM ('INTER', 'XP', 'NUBANK', 'GCB', 'CLEAR', 'SOFISA', 'BMG', 'VEST');

-- AlterTable
ALTER TABLE "ativos" ADD COLUMN     "instituicao" "Instituicao",
ALTER COLUMN "quantidade" DROP NOT NULL;
