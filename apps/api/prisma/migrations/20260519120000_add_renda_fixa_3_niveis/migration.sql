-- Migration: aplica CTI de 3 níveis para renda fixa (spec 005 / ADR 003).
-- Preserva os dados dos CRIs existentes movendo colunas entre tabelas.

-- =====================================================
-- 1. Estende enum TipoAtivo com os 3 tipos novos.
-- =====================================================
ALTER TYPE "TipoAtivo" ADD VALUE IF NOT EXISTS 'CRA';
ALTER TYPE "TipoAtivo" ADD VALUE IF NOT EXISTS 'LCI';
ALTER TYPE "TipoAtivo" ADD VALUE IF NOT EXISTS 'LCA';

-- =====================================================
-- 2. Cria a tabela intermediária ativos_renda_fixa.
-- =====================================================
CREATE TABLE "ativos_renda_fixa" (
    "ativo_id"            TEXT                  NOT NULL,
    "data_vencimento"     DATE                  NOT NULL,
    "indexador"           "Indexador"           NOT NULL,
    "tipo_taxa"           "TipoTaxa"            NOT NULL,
    "taxa"                DECIMAL(8,4)          NOT NULL,
    "periodicidade_juros" "PeriodicidadeJuros",

    CONSTRAINT "ativos_renda_fixa_pkey" PRIMARY KEY ("ativo_id")
);

ALTER TABLE "ativos_renda_fixa"
    ADD CONSTRAINT "ativos_renda_fixa_ativo_id_fkey"
        FOREIGN KEY ("ativo_id")
        REFERENCES "ativos"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- =====================================================
-- 3. Copia colunas de RF de cris → ativos_renda_fixa
--    (antes de droppar as colunas em cris).
-- =====================================================
INSERT INTO "ativos_renda_fixa" (
    "ativo_id", "data_vencimento", "indexador",
    "tipo_taxa", "taxa", "periodicidade_juros"
)
SELECT
    "ativo_id", "data_vencimento", "indexador",
    "tipo_taxa", "taxa", "periodicidade_juros"
FROM "cris";

-- =====================================================
-- 4. Adiciona emissor + quantidade em cris (nullable).
-- =====================================================
ALTER TABLE "cris" ADD COLUMN "emissor"    TEXT;
ALTER TABLE "cris" ADD COLUMN "quantidade" INTEGER;

-- =====================================================
-- 5. Copia emissor e quantidade de ativos → cris
--    para as linhas de tipo CRI (que hoje são todas).
-- =====================================================
UPDATE "cris" c
   SET "emissor"    = a."emissor",
       "quantidade" = a."quantidade"
  FROM "ativos" a
 WHERE c."ativo_id" = a."id"
   AND a."tipo"     = 'CRI';

-- =====================================================
-- 6. Remove colunas migradas de cris.
-- =====================================================
ALTER TABLE "cris" DROP COLUMN "data_vencimento";
ALTER TABLE "cris" DROP COLUMN "indexador";
ALTER TABLE "cris" DROP COLUMN "tipo_taxa";
ALTER TABLE "cris" DROP COLUMN "taxa";
ALTER TABLE "cris" DROP COLUMN "periodicidade_juros";

-- =====================================================
-- 7. Remove emissor e quantidade de ativos
--    (já copiados para cris no passo 5).
-- =====================================================
ALTER TABLE "ativos" DROP COLUMN "emissor";
ALTER TABLE "ativos" DROP COLUMN "quantidade";

-- =====================================================
-- 8. Troca FK de cris.ativo_id: agora aponta para
--    ativos_renda_fixa.ativo_id (não mais ativos.id).
--    A integridade transitiva é preservada porque
--    ativos_renda_fixa.ativo_id é FK em ativos.id.
-- =====================================================
ALTER TABLE "cris" DROP CONSTRAINT "cris_ativo_id_fkey";

ALTER TABLE "cris"
    ADD CONSTRAINT "cris_ativo_id_fkey"
        FOREIGN KEY ("ativo_id")
        REFERENCES "ativos_renda_fixa"("ativo_id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- =====================================================
-- 9. Cria tabela cras (mesma estrutura de cris).
-- =====================================================
CREATE TABLE "cras" (
    "ativo_id"      TEXT          NOT NULL,
    "emissor"       TEXT,
    "quantidade"    INTEGER,
    "valor_nominal" DECIMAL(18,4),

    CONSTRAINT "cras_pkey" PRIMARY KEY ("ativo_id")
);

ALTER TABLE "cras"
    ADD CONSTRAINT "cras_ativo_id_fkey"
        FOREIGN KEY ("ativo_id")
        REFERENCES "ativos_renda_fixa"("ativo_id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- =====================================================
-- 10. Cria tabelas lcis e lcas (marcadoras: só ativo_id).
-- =====================================================
CREATE TABLE "lcis" (
    "ativo_id" TEXT NOT NULL,
    CONSTRAINT "lcis_pkey" PRIMARY KEY ("ativo_id")
);

ALTER TABLE "lcis"
    ADD CONSTRAINT "lcis_ativo_id_fkey"
        FOREIGN KEY ("ativo_id")
        REFERENCES "ativos_renda_fixa"("ativo_id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

CREATE TABLE "lcas" (
    "ativo_id" TEXT NOT NULL,
    CONSTRAINT "lcas_pkey" PRIMARY KEY ("ativo_id")
);

ALTER TABLE "lcas"
    ADD CONSTRAINT "lcas_ativo_id_fkey"
        FOREIGN KEY ("ativo_id")
        REFERENCES "ativos_renda_fixa"("ativo_id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;

-- =====================================================
-- 11. ativos.instituicao agora é NOT NULL.
--     Backfill já garantido em ambiente (todos os
--     registros existentes têm instituição preenchida).
-- =====================================================
ALTER TABLE "ativos" ALTER COLUMN "instituicao" SET NOT NULL;
