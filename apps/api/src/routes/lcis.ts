import { LciInputSchema } from '@assets-db/shared';
import { makeAtivoTypeRoutes } from './_ativo-routes.js';

export const lciRoutes = makeAtivoTypeRoutes({
  tipo: 'LCI',
  leafRelation: 'lci',
  inputSchema: LciInputSchema,
});
