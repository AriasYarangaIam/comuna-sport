// S4 (odd/tasks/deploy-hardening.md): SIGTERM/SIGINT handling for a deployed
// process. The listener must stop accepting connections before the pool is
// released, the handler must be idempotent (signals repeat on some platforms),
// and a failure on one step must not skip the other — a leaked PostgreSQL
// connection survives the process otherwise.
export interface ShutdownTarget {
    closeServer(): Promise<void>;
    closeResources(): Promise<void>;
}

export type ShutdownHandler = () => Promise<void>;

export const createShutdownHandler = (
    target: ShutdownTarget,
    exit: (code: number) => void
): ShutdownHandler => {
    let running: Promise<void> | undefined;

    const run = async (): Promise<void> => {
        let code: number = 0;

        try {
            await target.closeServer();
        } catch {
            // The listener may already be closed; releasing the pool still matters.
            code = 1;
        }

        try {
            await target.closeResources();
        } catch {
            code = 1;
        }

        exit(code);
    };

    // Memoised: a second signal joins the first run instead of closing twice.
    return (): Promise<void> => {
        running ??= run();
        return running;
    };
};
