import type { Express } from "express";
import { buildContainer, Container } from "../src/infrastructure/di/container";
import { createApp } from "../src/main";

// Serverless entry point for the Vercel deployment.
//
// Vercel invokes the exported Express app as the request handler. The container
// is built once per warm instance so the PostgreSQL pool and the handler graph
// are reused across invocations instead of being rebuilt per request.
//
// `src/main.ts` keeps `bootstrap()` behind `require.main === module`, so
// importing `createApp` here never opens a port.
const container: Container = buildContainer();
const app: Express = createApp(container);

export default app;
