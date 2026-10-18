import { Router } from "express";
import { idempotencyGuard } from "../middleware/idempotency.middleware";
import type { ReservationController } from "../controllers/reservation.controller";

// POST /spaces/:id/reservations — plural-noun path, idempotencyGuard (D4).
export const createReservationRoutes = (controller: ReservationController): Router => {
    const router: Router = Router();
    router.post('/spaces/:id/reservations', idempotencyGuard, controller.create);
    return router;
};
