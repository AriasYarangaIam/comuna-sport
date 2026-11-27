import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ReservationController } from '../controllers/reservation.controller';

// POST /spaces/:slug/reservations — plural-noun path, idempotency guard (D4)
// injected by the composition root so the guard shares the container's store.
// The read routes carry NO guard: GET is idempotent by definition, and DELETE
// (S4, odd/tasks/demo-completion.md) is authorised by the reservation UUID the
// citizen holds, so it needs no key either.
export const createReservationRoutes = (controller: ReservationController, guard: RequestHandler): Router => {
    const router: Router = Router();
    router.post('/spaces/:slug/reservations', guard, controller.create);
    router.get('/reservations/:id', controller.getById);
    router.delete('/reservations/:id', controller.cancel);
    router.get('/users/:dni/reservations', controller.listByUser);
    return router;
};
