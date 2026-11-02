import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  path?: string;
}

/**
 * Renderiza un elemento con QueryClient propio y un router en memoria.
 * `route` es la URL inicial; `path` la ruta declarada para leer `useParams`.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', path, ...options }: RenderWithProvidersOptions = {},
) => {
  const queryClient = createTestQueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {path === undefined ? (
          children
        ) : (
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        )}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { queryClient, ...render(ui, { wrapper, ...options }) };
};

export const renderRoute = (
  ui: ReactElement,
  route: string,
  path: string,
  options: Omit<RenderWithProvidersOptions, 'route' | 'path'> = {},
) => renderWithProviders(ui, { route, path, ...options });
