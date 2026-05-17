-- CreateEnum
CREATE TYPE "TipoAtivo" AS ENUM ('CRI');

-- CreateEnum
CREATE TYPE "Indexador" AS ENUM ('PREFIXADO', 'CDI', 'IPCA');

-- CreateEnum
CREATE TYPE "TipoTaxa" AS ENUM ('PRE', 'POS_PERCENTUAL', 'POS_SPREAD');

-- CreateTable
CREATE TABLE "ativos" (
    "id" TEXT NOT NULL,
    "tipo" "TipoAtivo" NOT NULL,
    "codigo" TEXT NOT NULL,
    "emissor" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_aquisicao" DECIMAL(18,4) NOT NULL,
    "data_aquisicao" DATE NOT NULL,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cris" (
    "ativo_id" TEXT NOT NULL,
    "valor_nominal" DECIMAL(18,4) NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "indexador" "Indexador" NOT NULL,
    "tipo_taxa" "TipoTaxa" NOT NULL,
    "taxa" DECIMAL(8,4) NOT NULL,

    CONSTRAINT "cris_pkey" PRIMARY KEY ("ativo_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ativos_codigo_key" ON "ativos"("codigo");

-- AddForeignKey
ALTER TABLE "cris" ADD CONSTRAINT "cris_ativo_id_fkey" FOREIGN KEY ("ativo_id") REFERENCES "ativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
