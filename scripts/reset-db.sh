#!/usr/bin/env sh
set -eu

pnpm --filter @epg-cms/api prisma migrate reset --force
