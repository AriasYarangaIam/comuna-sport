import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ReservationController } from '../controllers/reservation.controller';

// POST /spaces/:id/reservations — plural-noun path, idempotency guard (D4)
// injected by the composition root so the guard shares the container's store.
export const createReservationRoutes = (controller: ReservationController, guard: RequestHandler): Router => {
    const router: Router = Router();
    router.post('/spaces/:id/reservations', guard, controller.create);
    return router;
};
