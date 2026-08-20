<!-- AGENTS.md: Guidance for AI coding agents in this repository -->

# Agent Guide — fin-tech platform

Purpose: quick, actionable instructions and links for coding agents working in this repository.

- **Repo layout**: backend/ (NestJS API), frontend/ (Next.js app), docs/ (API, architecture, DB schema), prisma/ (migrations under backend/prisma).

- **Quick commands (from repo root)**:
  - Dev backend: `npm run dev:backend` (runs `backend` in watch mode)
  - Dev frontend: `npm run dev:frontend` (runs `frontend` Next dev)
  - Build backend: `npm run build:backend`
  - Build frontend: `npm run build:frontend`
  - Run backend tests: `npm run test:backend`
  - Lint: `npm run lint:backend` and `npm run lint:frontend`

- **Where to look first**:
  - Backend source and Prisma config: [backend/README.md](backend/README.md)
  - Frontend agent rules and Next-specific block: [frontend/AGENTS.md](frontend/AGENTS.md)
  - API reference and architecture notes: [docs/api-reference.md](docs/api-reference.md) — [docs/architecture.md](docs/architecture.md)

- **Prisma & database**:
  - Schema and migrations live under `backend/prisma/`.
  - Common commands: `prisma migrate dev`, `prisma generate`, `prisma db seed` (run from `backend`).
  - NOTE: the repo contains backend `.agents` Prisma skills that enforce an AI safety checkpoint for destructive DB commands; always ask for explicit consent before running `migrate reset` or other destructive operations. See `backend/.agents/skills/prisma-cli/references/agent-safety.md`.

- **Agent safety and redaction**:
  - Never print secrets (service tokens, full DATABASE_URLs, or env values).
  - Use `--json --no-interactive` for scripts when automation is required.

- **Common agent tasks**:
  - For feature work: run backend tests and frontend dev to reproduce issues.
  - For DB changes: propose migration steps in a PR and run `prisma migrate dev` locally.
  - For deploy or compute tasks: prefer generated scripts (`compute:deploy`) or documented `package.json` scripts.

- **Where to add more agent guidance**:
  - If you need workspace-wide agent policies, update this file. For framework-specific agent rules, prefer per-package files (e.g., `frontend/AGENTS.md`).

---

If you want, I can also add a `.github/copilot-instructions.md` or expand this with automated checklists (CI hooks, safe-prisma actions). Which would you like next?
