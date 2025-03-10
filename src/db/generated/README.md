# Genereated Migrations

This directory contains `migrations.ts` which is generated at build time (Vite) from the migrations in `src/db/drizzle`.

It *should* get checked into Git so that the codebase imports are fully working and pass TypeScript checks without needing to build the project first.

The migrations are run when the app is opened.