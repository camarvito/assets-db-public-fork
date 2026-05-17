import { Prisma, PrismaClient } from '@prisma/client';

// Serializa Prisma.Decimal como string no JSON (evita perda de precisão
// em valores monetários e taxas). Aplicado uma vez no boot.
Prisma.Decimal.prototype.toJSON = function () {
  return this.toString();
};

export const prisma = new PrismaClient();
