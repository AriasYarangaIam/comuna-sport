import { Router } from "express";
import type { IncidentController } from "../controllers/incident.controller";

// POST /incidents — plural-noun path.
export const createIncidentRoutes = (controller: IncidentController): Router => {
    const router: Router = Router();
    router.post('/incidents', controller.create);
    return router;
};
