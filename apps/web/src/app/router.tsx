import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';

const ExplorePage = lazy(() =>
  import('../features/explore/ExplorePage').then((module) => ({
    default: module.ExplorePage,
  })),
);
const AvailabilityPage = lazy(() =>
  import('../features/availability/AvailabilityPage').then((module) => ({
    default: module.AvailabilityPage,
  })),
);
const ReservationPage = lazy(() =>
  import('../features/reservation/ReservationPage').then((module) => ({
    default: module.ReservationPage,
  })),
);
const ReceiptPage = lazy(() =>
  import('../features/receipt/ReceiptPage').then((module) => ({
    default: module.ReceiptPage,
  })),
);
const MyReservationsPage = lazy(() =>
  import('../features/my-reservations/MyReservationsPage').then((module) => ({
    default: module.MyReservationsPage,
  })),
);
const IncidentsPage = lazy(() =>
  import('../features/incidents/IncidentsPage').then((module) => ({
    default: module.IncidentsPage,
  })),
);
const HelpPage = lazy(() =>
  import('../features/help/HelpPage').then((module) => ({
    default: module.HelpPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('../features/not-found/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <ExplorePage /> },
      { path: 'disponibilidad', element: <AvailabilityPage /> },
      { path: 'reservar/:spaceId', element: <ReservationPage /> },
      { path: 'recibo/:reservationId', element: <ReceiptPage /> },
      { path: 'mis-reservas', element: <MyReservationsPage /> },
      { path: 'incidentes', element: <IncidentsPage /> },
      { path: 'ayuda', element: <HelpPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
