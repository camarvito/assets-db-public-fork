import { Prisma, PrismaClient } from '@prisma/client';

// Serialize Prisma.Decimal as a string in JSON output to preserve precision
// for monetary values and rates. Applied once at boot.
Prisma.Decimal.prototype.toJSON = function () {
  return this.toString();
};

export const prisma = new PrismaClient();
