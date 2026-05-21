import { CraInputSchema } from '@assets-db/shared';
import { makeAtivoTypeRoutes } from './_ativo-routes.js';

export const craRoutes = makeAtivoTypeRoutes({
  tipo: 'CRA',
  leafRelation: 'cra',
  inputSchema: CraInputSchema,
});
