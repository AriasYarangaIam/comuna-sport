# API image for the ComunaSport backend.
# Two stages so the runtime image carries no TypeScript, no test runner and no
# workspace-only dev dependencies.

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
# Manifests first: the dependency layer is cached until a lockfile changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --prod && pnpm store prune
COPY --from=build /app/dist ./dist
# db/ carries the forward-only SQL migrations and the zero-dependency runners;
# the container applies them at start so a fresh managed database is usable.
COPY db ./db
EXPOSE 3000
# PORT is supplied by the platform; the default keeps `docker run -p 3000:3000` working.
CMD ["sh", "-c", "node db/migrate.js && node db/seed.js && node dist/main.js"]
