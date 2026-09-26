# GIT WORKFLOW

Team of 4, vertical feature slices, one person owns full-stack (frontend + backend) per feature.

## Branching
- `main` is always deployable and protected — never commit directly to it.
- Each feature gets its own branch: `feature/<name>` (e.g. `feature/auth`, `feature/dashboard`).
- One branch = one person = one vertical slice (frontend + backend for that feature).

## Starting a new slice
```bash
git checkout main
git pull origin main
git checkout -b feature/<name>
```

## While working
- Commit small and often — one logical change per commit, not one giant commit at the end.
- Only touch files inside your own `client/src/features/<name>/` and your own
  `server/src/routes/`, `controllers/`, and migration file. Never edit another
  teammate's feature folder.

Commit message format:
```
feat(<scope>): short description
fix(<scope>): short description
style(<scope>): short description
```

## Before touching a SHARED file
Shared files: `client/src/App.jsx` (or router file), `server/src/server.js`,
and `server/database/migrations/` (for numbering only — content is per-feature).

Always sync first:
```bash
git checkout main
git pull origin main
git checkout feature/<name>
git merge main
```
Then make your one small addition (e.g. one `<Route>` line, one `app.use()` line,
or the next migration number), commit, and push immediately — don't leave
shared-file changes uncommitted.

## Migrations
- Numbered, sequential SQL files in `server/database/migrations/`
  (`001_create_users.sql`, `002_create_<feature>.sql`, ...).
- Never edit a migration file once it's pushed. A fix is a NEW numbered file.
- After pulling a new migration, run it manually against your own local MySQL:
```bash
mysql -u root -p hackathon_dev < server/database/migrations/00X_name.sql
```

## Finishing a slice
```bash
git add <only your changed files>
git commit -m "feat(<scope>): description"
git push origin feature/<name>
```
Open a PR into `main`. One other teammate reviews before merge — no self-merging,
and no merging an AI agent's diff without a human skim first.

```bash
git checkout main
git pull origin main
git merge feature/<name>
git push origin main
git branch -d feature/<name>
```

## Before starting your NEXT slice
```bash
git checkout main
git pull origin main
```
Always start fresh from the latest `main`, not from your old branch.

## Conflict resolution
- Conflicts in your OWN feature files should not happen — you're the only one
  touching them.
- Conflicts in shared files (router, server.js) are resolved by keeping BOTH
  changes (each person's line), removing the `<<<<<<<` / `=======` / `>>>>>>>`
  markers, then:
```bash
git add <file>
git commit -m "merge: resolve conflict in <file>"
git push
```

## Repo folder structure (for reference)
```
project-root/
├── client/
│   └── src/
│       ├── assets/
│       ├── components/       # shared UI primitives
│       ├── features/         # one folder per vertical slice
│       │   ├── auth/
│       │   ├── feature-a/
│       │   ├── feature-b/
│       │   └── feature-c/
│       ├── api/               # shared axios/fetch client wrapper
│       └── App.jsx            # shared router — touch carefully
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/        # JWT auth middleware
│   │   ├── db/                # mysql2 connection pool
│   │   └── server.js          # thin — only mounts routes, touch carefully
│   └── database/
│       └── migrations/        # numbered, hand-written .sql files
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── RULES.md
    ├── PHASES.md
    ├── DESIGN.md
    └── MEMORY.md
```

## .gitignore (already excluded, never commit)
```
node_modules/
.env
```
