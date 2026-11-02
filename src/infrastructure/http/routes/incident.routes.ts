import { Router } from "express";
import type { IncidentController } from "../controllers/incident.controller";

// POST /incidents — plural-noun path. The read routes mirror the write path:
// an incident is addressable by its own id and by the space it belongs to.
export const createIncidentRoutes = (controller: IncidentController): Router => {
    const router: Router = Router();
    router.post('/incidents', controller.create);
    router.get('/incidents/:id', controller.getById);
    router.get('/spaces/:id/incidents', controller.listBySpace);
    return router;
};
