import { builtinEnvironments } from 'vitest/environments';
import type { Environment } from 'vitest/environments';

/**
 * jsdom reemplaza `AbortController` y `AbortSignal` por sus propias clases.
 * El `fetch` nativo de Node (undici) valida las señales contra su clase nativa
 * y lanza "Expected signal to be an instance of AbortSignal" cuando MSW
 * reconstruye la petición. Restauramos las clases nativas después de que jsdom
 * instale su entorno; así React Query y MSW comparten el mismo tipo.
 *
 * Referencia: vitest-dev/vitest#8374 y mswjs/msw#2530.
 */
const NativeAbortController = globalThis.AbortController;
const NativeAbortSignal = globalThis.AbortSignal;

const environment: Environment = {
  name: 'jsdom-native-abort',
  transformMode: 'web',
  async setup(global, options) {
    const result = await builtinEnvironments.jsdom.setup(global, options);
    global.AbortController = NativeAbortController;
    global.AbortSignal = NativeAbortSignal;
    return result;
  },
};

export default environment;
