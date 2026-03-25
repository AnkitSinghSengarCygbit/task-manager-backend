# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev   # Start dev server with nodemon hot reload
npm start     # Start production server
```

No test runner, linter, or build step is configured.

## Architecture

Express + MongoDB/Mongoose REST API. Entry point is `server.js`.

**Layer structure:**
- `models/` — Mongoose schemas: `user.models.js` (User), `task.models.js` (Task with owner ref)
- `routes/` — Express routers: `auth.routes.js` (/users), `taskRoutes.js` (/tasks)
- `middleware/authMiddleware.js` — JWT Bearer token verification; attaches decoded payload to `req.user.userId`

**Auth flow:** Register/login at `/users/register` and `/users/login` return a JWT (1hr expiry). All task endpoints require `Authorization: Bearer <token>`.

**Task ownership:** Tasks store an `owner` reference (User ObjectId). PATCH and DELETE routes verify `task.owner == req.user.userId` before allowing changes.

**Task status enum:** `'pending' | 'progress' | 'completed'`

**CORS:** Configured for `http://localhost:5173` (Vite frontend).

**Env vars** (in `.env`):
- `PORT` — default 3000
- `MONGODB_URL` — MongoDB connection string
- `JWT_SECRET` — secret for signing tokens
