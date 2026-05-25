FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --filter @epg-cms/admin-web... --frozen-lockfile=false

FROM deps AS build
COPY apps/admin-web apps/admin-web
COPY packages packages
RUN pnpm --filter @epg-cms/admin-web build

FROM base AS runner
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/admin-web/node_modules ./apps/admin-web/node_modules
COPY --from=build /app/apps/admin-web/dist ./apps/admin-web/dist
COPY --from=build /app/apps/admin-web/package.json ./apps/admin-web/package.json
WORKDIR /app/apps/admin-web
EXPOSE 3000
CMD ["node", "node_modules/vite/bin/vite.js", "preview", "--host", "0.0.0.0", "--port", "3000"]
