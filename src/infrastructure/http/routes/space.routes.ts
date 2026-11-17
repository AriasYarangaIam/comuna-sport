import { Router } from 'express';
import type { SpaceController } from '../controllers/space.controller';

// GET /spaces/availability MUST be registered before GET /spaces/:slug, otherwise
// the parameterized route would capture the literal 'availability' segment.
export const createSpaceRoutes = (controller: SpaceController): Router => {
    const router: Router = Router();
    router.get('/spaces/availability', controller.findAvailable);
    router.get('/spaces', controller.listAll);
    router.get('/spaces/:slug', controller.getById);
    return router;
};
