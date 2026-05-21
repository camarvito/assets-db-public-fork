import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Seeds dos 4 tipos de renda fixa cobertos hoje, com periodicidades e
// indexadores variados pra exercitar os enums. Idempotente via upsert
// no `codigo` (único em Ativo).

type AtivoBase = {
  nome: string;
  instituicao: Prisma.AtivoCreateInput['instituicao'];
  precoAquisicao: string;
  dataAquisicao: Date;
  observacoes?: string | null;
};

type RendaFixaBase = {
  dataVencimento: Date;
  indexador: Prisma.AtivoRendaFixaCreateWithoutAtivoInput['indexador'];
  tipoTaxa: Prisma.AtivoRendaFixaCreateWithoutAtivoInput['tipoTaxa'];
  taxa: string;
  periodicidadeJuros?: Prisma.AtivoRendaFixaCreateWithoutAtivoInput['periodicidadeJuros'];
};

type CriCraExtras = {
  emissor?: string;
  quantidade?: number;
  valorNominal?: string;
};

type Seed =
  | { codigo: string; tipo: 'CRI'; ativo: AtivoBase; rendaFixa: RendaFixaBase; cri: CriCraExtras }
  | { codigo: string; tipo: 'CRA'; ativo: AtivoBase; rendaFixa: RendaFixaBase; cra: CriCraExtras }
  | { codigo: string; tipo: 'LCI'; ativo: AtivoBase; rendaFixa: RendaFixaBase }
  | { codigo: string; tipo: 'LCA'; ativo: AtivoBase; rendaFixa: RendaFixaBase };

const seeds: Seed[] = [
  {
    codigo: 'CRI23A001',
    tipo: 'CRI',
    ativo: {
      nome: 'CRI Alpha',
      instituicao: 'XP',
      precoAquisicao: '990.0000',
      dataAquisicao: new Date('2023-04-10T00:00:00Z'),
      observacoes: null,
    },
    rendaFixa: {
      dataVencimento: new Date('2028-04-10T00:00:00Z'),
      indexador: 'PREFIXADO',
      tipoTaxa: 'PRE',
      taxa: '12.0000',
      periodicidadeJuros: 'SEMESTRAL',
    },
    cri: { emissor: 'Securitizadora Alpha SA', quantidade: 5, valorNominal: '1000.0000' },
  },
  {
    codigo: 'CRI24B001',
    tipo: 'CRI',
    ativo: {
      nome: 'CRI Beta',
      instituicao: 'INTER',
      precoAquisicao: '985.5000',
      dataAquisicao: new Date('2024-09-20T00:00:00Z'),
      observacoes: 'Lastro em recebíveis comerciais',
    },
    rendaFixa: {
      dataVencimento: new Date('2029-09-20T00:00:00Z'),
      indexador: 'CDI',
      tipoTaxa: 'POS_SPREAD',
      taxa: '1.4500',
      periodicidadeJuros: 'TRIMESTRAL',
    },
    cri: { emissor: 'Securitizadora Beta SA', quantidade: 10, valorNominal: '1000.0000' },
  },
  {
    codigo: 'CRI22C001',
    tipo: 'CRI',
    ativo: {
      nome: 'CRI Gamma',
      instituicao: 'BMG',
      precoAquisicao: '1010.0000',
      dataAquisicao: new Date('2022-06-15T00:00:00Z'),
      observacoes: null,
    },
    rendaFixa: {
      dataVencimento: new Date('2032-06-15T00:00:00Z'),
      indexador: 'IPCA',
      tipoTaxa: 'POS_SPREAD',
      taxa: '6.5000',
      periodicidadeJuros: 'BULLET',
    },
    cri: { emissor: 'Securitizadora Gamma SA', quantidade: 3, valorNominal: '1000.0000' },
  },
  {
    codigo: 'CRA25D001',
    tipo: 'CRA',
    ativo: {
      nome: 'CRA Delta',
      instituicao: 'XP',
      precoAquisicao: '995.0000',
      dataAquisicao: new Date('2025-02-05T00:00:00Z'),
      observacoes: 'Lastro agrícola — cana-de-açúcar',
    },
    rendaFixa: {
      dataVencimento: new Date('2030-02-05T00:00:00Z'),
      indexador: 'IPCA',
      tipoTaxa: 'POS_SPREAD',
      taxa: '7.2000',
      periodicidadeJuros: 'SEMESTRAL',
    },
    cra: { emissor: 'Securitizadora Delta SA', quantidade: 4, valorNominal: '1000.0000' },
  },
  {
    codigo: 'LCI24E001',
    tipo: 'LCI',
    ativo: {
      nome: 'LCI Inter 2024',
      instituicao: 'INTER',
      precoAquisicao: '5000.0000',
      dataAquisicao: new Date('2024-11-12T00:00:00Z'),
      observacoes: null,
    },
    rendaFixa: {
      dataVencimento: new Date('2027-11-12T00:00:00Z'),
      indexador: 'CDI',
      tipoTaxa: 'POS_PERCENTUAL',
      taxa: '94.0000',
      periodicidadeJuros: 'BULLET',
    },
  },
  {
    codigo: 'LCA25F001',
    tipo: 'LCA',
    ativo: {
      nome: 'LCA Nubank 2025',
      instituicao: 'NUBANK',
      precoAquisicao: '3000.0000',
      dataAquisicao: new Date('2025-03-01T00:00:00Z'),
      observacoes: null,
    },
    rendaFixa: {
      dataVencimento: new Date('2028-03-01T00:00:00Z'),
      indexador: 'CDI',
      tipoTaxa: 'POS_PERCENTUAL',
      taxa: '90.0000',
      periodicidadeJuros: 'BULLET',
    },
  },
];

async function upsertSeed(seed: Seed) {
  const existing = await prisma.ativo.findUnique({ where: { codigo: seed.codigo } });
  if (existing) {
    console.log(`= ${seed.codigo} (já existe)`);
    return;
  }

  const rendaFixaCreate: Prisma.AtivoRendaFixaCreateWithoutAtivoInput = {
    ...seed.rendaFixa,
    ...(seed.tipo === 'CRI' && { cri: { create: seed.cri } }),
    ...(seed.tipo === 'CRA' && { cra: { create: seed.cra } }),
    ...(seed.tipo === 'LCI' && { lci: { create: {} } }),
    ...(seed.tipo === 'LCA' && { lca: { create: {} } }),
  };

  await prisma.ativo.create({
    data: {
      tipo: seed.tipo,
      codigo: seed.codigo,
      ...seed.ativo,
      rendaFixa: { create: rendaFixaCreate },
    },
  });
  console.log(`✓ ${seed.codigo}`);
}

async function main() {
  for (const seed of seeds) {
    await upsertSeed(seed);
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
