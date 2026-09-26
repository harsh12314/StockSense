# MEMORY / AI_CONTEXT — StockSense

Persistent context for any AI coding agent (Antigravity or otherwise)
working in this repo. Read this before generating code. Distinguishes
**stated facts** (from the spec/team decisions) from **assumptions**
(filled in where the spec was silent) — never treat an assumption as
a hard requirement if it conflicts with something a teammate says live.

## Project identity
- Product: **StockSense**, an Inventory Management System, Odoo-inspired
  UX. See `PRD.md` for full feature spec.
- Hackathon: Odoo x GCET Hyderabad Hackathon 2026, 8-hour virtual round.
- Team of 4, building via **vertical feature slices** — each person owns
  one feature's full stack (frontend + backend + own migration) and
  commits it themselves. See `PHASES.md` for the slice/owner mapping.

## Stack (stated, not assumed)
- Express + Node backend, React (Vite) frontend
- MySQL, native local install per teammate (no Docker, no managed cloud DB)
- Raw SQL via `mysql2` — **no ORM, no Prisma**
- Self-issued JWT auth (`bcrypt` + `jsonwebtoken`) — **not Firebase**
- Google Antigravity as the IDE
- Principle: minimize third-party APIs/managed services

## Hard rules an agent must never violate
- Never string-concatenate SQL — always `?` parameterized queries
  (`mysql2`).
- Never introduce Prisma, Sequelize, TypeORM, or any ORM — raw SQL only.
- Never introduce Firebase, Auth0, or any third-party auth provider —
  JWT only.
- Never edit an already-pushed migration file — write a new numbered one.
- Never touch another teammate's feature folder
  (`client/src/features/<name>/`, `server/src/routes/<name>...`) without
  explicit instruction.
- Every stock-mutating action must also write a Move History ledger row
  in the same operation.
- Follow the standard API response envelope
  (`{ success, data }` / `{ success: false, error: { message } }`) in
  every route — see `ARCHITECTURE.md`.

## Assumptions made (spec was silent) — flag if a teammate corrects these
- OTP reset delivered via email (channel unspecified in source spec).
- No role-based permission enforcement between Inventory Manager and
  Warehouse Staff for MVP — both roles get equal API access.
- Reordering-rule field exists on Product but has no automated logic.
- Cancel action is status-only — no stock/reservation reversal logic.
- Stock Adjustments auto-apply with no review/approval step.
- JWT expiry set to ~24h (no refresh-token rotation — unnecessary for a
  same-day demo).

## Reference docs in this repo
- `PRD.md` — full product spec, screens, business rules
- `ARCHITECTURE.md` — stack, feature ownership, API/data-flow design
- `RULES.md` — coding/security/quality standards, mapped to judging criteria
- `PHASES.md` — hour-by-hour build plan and owner per feature
- `DESIGN.md` — shared components, color mapping, screen inventory
- `DATABASE.md` — schema, migration workflow
- `GIT_WORKFLOW.md` — branching, commit, and shared-file conventions

## When in doubt
If a generated change would touch a shared file (`server.js` router
mounting, `client/src/App.jsx`), keep the change to a single appended
line and flag it for the owning teammate to pull-merge — don't rewrite
the whole file. If a request conflicts with a rule above, stop and ask
rather than silently overriding it.
