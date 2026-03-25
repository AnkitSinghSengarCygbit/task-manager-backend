# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with ts-node + nodemon (no build needed)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output from dist/ (requires build first)
npm run start:build  # Build then start (production)
```

No test runner or linter is configured.

## Architecture

Express + MongoDB/Mongoose REST API written in TypeScript. Entry point is `src/server.ts`; compiled output goes to `dist/`.

**Layer structure:**
- `src/models/` — Mongoose schemas with typed interfaces: `user.models.ts` (`IUser`), `task.models.ts` (`ITask`)
- `src/routes/` — Express routers: `auth.routes.ts` (/users), `taskRoutes.ts` (/tasks)
- `src/middleware/authMiddleware.ts` — JWT Bearer token verification; attaches decoded payload to `req.user.userId`
- `src/types/express.d.ts` — Declaration merge that adds `user?: { userId: string }` to Express `Request`

**Auth flow:** Register/login at `/users/register` and `/users/login` return a JWT (1hr expiry). All task endpoints require `Authorization: Bearer <token>`.

**Task ownership:** Tasks store an `owner` reference (User ObjectId). PATCH and DELETE routes verify `task.owner.toString() === req.user.userId` before allowing changes.

**Task status enum:** `'pending' | 'progress' | 'completed'` — exported as `TaskStatus` from `src/models/task.models.ts`

**CORS:** Configured for `http://localhost:5173` (Vite frontend), credentials enabled.

**Env vars** (in `.env`):
- `PORT` — default 3000
- `MONGODB_URL` — MongoDB connection string
- `JWT_SECRET` — secret for signing tokens

## TypeScript notes

- `tsconfig.json` has `"ts-node": { "files": true }` — required so ts-node loads `src/types/express.d.ts` (the global Request augmentation). Without it, `req.user` errors at runtime.
- Mongoose v9 ships its own types; no `@types/mongoose` needed.
- `bcryptjs` ships its own types; `@types/bcryptjs` is a stub no-op installed as a devDependency.
