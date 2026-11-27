import { Router } from "express";
import type { RequestHandler } from "express";
import type { IncidentController } from "../controllers/incident.controller";

// POST /incidents — plural-noun path. The read routes mirror the write path:
// an incident is addressable by its own id and by the space it belongs to.
// PATCH /incidents/:id (S1, odd/tasks/demo-completion.md) is the municipal
// lifecycle action and carries the admin guard.
export const createIncidentRoutes = (controller: IncidentController, adminGuard: RequestHandler): Router => {
    const router: Router = Router();
    router.post('/incidents', controller.create);
    router.patch('/incidents/:id', adminGuard, controller.changeState);
    router.get('/incidents/:id', controller.getById);
    router.get('/spaces/:slug/incidents', controller.listBySpace);
    return router;
};
