import { Router } from 'express';
import type { SpaceController } from '../controllers/space.controller';

// GET /spaces/availability MUST be registered before GET /spaces/:id, otherwise
// the parameterized route would capture the literal 'availability' segment.
export const createSpaceRoutes = (controller: SpaceController): Router => {
    const router: Router = Router();
    router.get('/spaces/availability', controller.findAvailable);
    router.get('/spaces', controller.listAll);
    router.get('/spaces/:id', controller.getById);
    return router;
};
