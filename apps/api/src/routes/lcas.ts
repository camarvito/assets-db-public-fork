import { LcaInputSchema } from '@assets-db/shared';
import { makeAtivoTypeRoutes } from './_ativo-routes.js';

export const lcaRoutes = makeAtivoTypeRoutes({
  tipo: 'LCA',
  leafRelation: 'lca',
  inputSchema: LcaInputSchema,
});
