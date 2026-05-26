FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @epg-cms/worker... --frozen-lockfile=false

FROM deps AS build
COPY apps/worker apps/worker
COPY apps/api/prisma apps/api/prisma
RUN pnpm --filter @epg-cms/worker exec prisma generate --schema ../../apps/api/prisma/schema.prisma
RUN pnpm --filter @epg-cms/worker build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/package.json
WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]
