# Finance Dashboard Backend

A role-based finance backend for a finance dashboard with JWT auth, Postgres persistence, summaries, and robust access control. This README is concise; full endpoint details live in `API.md`.

## Features

**Core requirements**
- User and role management (create users, assign roles, manage status)
- Financial records CRUD with filters
- Dashboard summaries (totals, category totals, recent activity, trends)
- Role-based access control (viewer/analyst/admin)
- Input validation and structured error responses
- Persistent storage using Postgres + Prisma

**Optional enhancements implemented**
- Authentication using JWT access + refresh tokens
- Pagination for records
- Search for records (category/notes)
- Soft delete for records
- Rate limiting on auth
- Tests (Vitest + Supertest)
- Swagger UI at `/docs`

**Additional features beyond requirements (only two)**
- Account lockout after repeated failed logins
- Audit logging for auth and admin actions

## Quickstart

1. Install dependencies
```
npm install
```

2. Create environment file
```
cp .env.example .env
```

3. Run migrations
```
npx prisma migrate dev --name init
```

4. Start the server
```
npm run dev
```

## Documentation

- API reference: `API.md`
- Swagger UI: `http://localhost:3000/docs` (non-production only)

## Environment Variables

- `DATABASE_URL` (required)
- `DIRECT_URL` (required)
- `JWT_SECRET` (required for production)
- `JWT_EXPIRES_IN` (default: `1h`)
- `REFRESH_TOKEN_TTL_DAYS` (default: `7`)
- `LOCKOUT_MAX_ATTEMPTS` (default: `5`)
- `LOCKOUT_DURATION_MIN` (default: `15`)
- `ALLOW_BOOTSTRAP` (default: `false`)
- `CORS_ORIGIN` (default: `http://localhost:5173`)
- `PORT` (default: `3000`)

## Notes

- First admin creation requires `ALLOW_BOOTSTRAP=true`, then set it back to `false`.
- For a clean demo database, run: `npx prisma migrate reset --force`.