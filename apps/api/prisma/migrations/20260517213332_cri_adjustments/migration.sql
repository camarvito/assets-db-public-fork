-- CreateEnum
CREATE TYPE "PeriodicidadeJuros" AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'BULLET');

-- AlterTable: adiciona `nome` em ativos com backfill = codigo para registros existentes
ALTER TABLE "ativos" ADD COLUMN "nome" TEXT;
UPDATE "ativos" SET "nome" = "codigo" WHERE "nome" IS NULL;
ALTER TABLE "ativos" ALTER COLUMN "nome" SET NOT NULL;

-- AlterTable: adiciona periodicidade_juros em cris e torna valor_nominal opcional
ALTER TABLE "cris" ADD COLUMN     "periodicidade_juros" "PeriodicidadeJuros",
ALTER COLUMN "valor_nominal" DROP NOT NULL;
