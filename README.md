# SuViet360

Full-stack starter architecture with a **Next.js App Router frontend** and **Express + MongoDB backend**.

## Tech Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, Redux Toolkit
- Backend: Node.js, Express.js (MVC), MongoDB (Mongoose)
- Auth: JWT + HTTP-only cookies, role-based middleware (Admin/User)
- Forms: React Hook Form + Zod validation
- API: Axios centralized service
- Tooling: ESLint, Prettier, Nodemon, Concurrently, Vitest + Supertest

## Project Structure

```text
client/   # Next.js frontend
server/   # Express backend
```

## Environment Setup

Create local env files from examples:

- `client/.env.local.example` -> `client/.env.local`
- `server/.env.example` -> `server/.env`

## Install Dependencies
Delete package-lock.json where have README.md if error
From repository root:

```bash
npm install
```

## Run in Development

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Scripts

Root:

- `npm run dev` - run client and server together
- `npm run build` - build frontend
- `npm run lint` - lint frontend
- `npm run test` - run backend tests
- `npm run format` - check formatting

Backend API base: `http://localhost:5000/api`

## Auth API (Postman-ready)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` (protected)
- `GET /api/auth/admin` (admin-only)
- `GET /api/csrf-token` (CSRF bootstrap endpoint)

## Deployment Notes

- Frontend: Vercel
- Backend: Render or Railway
- Set production env vars (`JWT_SECRET`, `COOKIE_SECURE=true`, `CLIENT_URL`, `MONGO_URI`)
