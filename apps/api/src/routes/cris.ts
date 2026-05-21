import { CriInputSchema } from '@assets-db/shared';
import { makeAtivoTypeRoutes } from './_ativo-routes.js';

export const criRoutes = makeAtivoTypeRoutes({
  tipo: 'CRI',
  leafRelation: 'cri',
  inputSchema: CriInputSchema,
});
