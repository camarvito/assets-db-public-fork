import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// 3 CRIs cobrindo os 3 formatos de remuneração mais comuns.
// Idempotente via upsert no `codigo` (único).
const seeds: Array<{
  codigo: string;
  ativo: Omit<Prisma.AtivoCreateInput, 'tipo' | 'codigo' | 'cri'>;
  cri: Prisma.CriCreateWithoutAtivoInput;
}> = [
  {
    codigo: 'CRI23A001',
    ativo: {
      emissor: 'Securitizadora Alpha SA',
      instituicao: 'XP',
      quantidade: 5,
      precoAquisicao: '990.0000',
      dataAquisicao: new Date('2023-04-10T00:00:00Z'),
      observacoes: null,
    },
    cri: {
      valorNominal: '1000.0000',
      dataVencimento: new Date('2028-04-10T00:00:00Z'),
      indexador: 'PREFIXADO',
      tipoTaxa: 'PRE',
      taxa: '12.0000',
    },
  },
  {
    codigo: 'CRI24B001',
    ativo: {
      emissor: 'Securitizadora Beta SA',
      instituicao: 'INTER',
      quantidade: 10,
      precoAquisicao: '985.5000',
      dataAquisicao: new Date('2024-09-20T00:00:00Z'),
      observacoes: 'Lastro em recebíveis comerciais',
    },
    cri: {
      valorNominal: '1000.0000',
      dataVencimento: new Date('2029-09-20T00:00:00Z'),
      indexador: 'CDI',
      tipoTaxa: 'POS_SPREAD',
      taxa: '1.4500',
    },
  },
  {
    codigo: 'CRI22C001',
    ativo: {
      emissor: 'Securitizadora Gamma SA',
      instituicao: 'BMG',
      quantidade: 3,
      precoAquisicao: '1010.0000',
      dataAquisicao: new Date('2022-06-15T00:00:00Z'),
      observacoes: null,
    },
    cri: {
      valorNominal: '1000.0000',
      dataVencimento: new Date('2032-06-15T00:00:00Z'),
      indexador: 'IPCA',
      tipoTaxa: 'POS_SPREAD',
      taxa: '6.5000',
    },
  },
];

async function main() {
  for (const seed of seeds) {
    await prisma.ativo.upsert({
      where: { codigo: seed.codigo },
      // se já existir com esse `codigo`, não sobrescreve nada — mantém idempotente.
      update: {},
      create: {
        tipo: 'CRI',
        codigo: seed.codigo,
        ...seed.ativo,
        cri: { create: seed.cri },
      },
    });
    console.log(`✓ ${seed.codigo}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
