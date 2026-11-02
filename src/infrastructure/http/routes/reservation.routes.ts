import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ReservationController } from '../controllers/reservation.controller';

// POST /spaces/:id/reservations — plural-noun path, idempotency guard (D4)
// injected by the composition root so the guard shares the container's store.
// The read routes carry NO guard: GET is idempotent by definition.
export const createReservationRoutes = (controller: ReservationController, guard: RequestHandler): Router => {
    const router: Router = Router();
    router.post('/spaces/:id/reservations', guard, controller.create);
    router.get('/reservations/:id', controller.getById);
    router.get('/users/:userId/reservations', controller.listByUser);
    return router;
};
