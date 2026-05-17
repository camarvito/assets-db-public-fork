-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('JUROS', 'AMORTIZACAO');

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "ativo_id" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "data" DATE NOT NULL,
    "valor" DECIMAL(18,4) NOT NULL,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_ativo_id_idx" ON "eventos"("ativo_id");

-- CreateIndex
CREATE INDEX "eventos_data_idx" ON "eventos"("data");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_ativo_id_fkey" FOREIGN KEY ("ativo_id") REFERENCES "ativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
