# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime & Package Manager

**CRITICAL:** This project uses **BUN** exclusively as both the runtime and package manager. Do not use Node.js, npm, yarn, or pnpm. The project is heavily dependent on Bun.

## Essential Commands

### Development
```bash
bun run dev              # Run development server with watch mode (runs prebuild first)
bun run start            # Run production server (runs lint first)
```

### Database Operations
```bash
bun run db:reset         # Reset database (clear all data) - run before migrations on fresh DB
bun run db:makemigrations # Generate new migration files using drizzle-kit
bun run db:migrate       # Run pending migrations
bun run db:push          # Push schema changes directly (force mode)
bun run db:rollback      # Rollback last migration
bun run db:studio        # Open Drizzle Studio for database inspection
```

### Build & Quality
```bash
bun run build            # Build TypeScript (runs lint and cleans dist first)
bun run type-check       # Run TypeScript compiler without emitting files
bun run lint             # Run ESLint, Prettier, and git add changed files
```

## Project Architecture

### Core Structure

This is an **email marketing server** built with Express.js and TypeScript, designed to send bulk emails with batch processing capabilities.

**Tech Stack:**
- Runtime: Bun
- Framework: Express.js
- Database: PostgreSQL with Drizzle ORM
- Queue System: BullMQ with Redis
- Email: Nodemailer (migrated from SendGrid)
- Validation: Zod
- Authentication: JWT with bcrypt

### Application Entry Points

1. **[src/server.ts](src/server.ts)** - Main entry point
   - Imports and starts the email worker ([src/workers/email.worker.ts](src/workers/email.worker.ts))
   - Connects to database via [src/db/db.ts](src/db/db.ts)
   - Starts Express server

2. **[src/app.ts](src/app.ts)** - Express application setup
   - Configures middleware (helmet, cors, express.json)
   - Mounts routes from [src/routes/default.router.ts](src/routes/default.router.ts)
   - Sets up error handlers

### Feature-Based Organization

Features are organized in `src/features/` with a consistent structure:

```
features/
├── users/
│   ├── userControllers/
│   ├── userMiddlewares/
│   ├── userRepos/
│   ├── userRoutes/
│   ├── userServices/
│   ├── userUtils/
│   └── userValidation/
└── emailBatch/
    ├── emailBatchController/
    ├── emailBatchRoutes/
    └── emailBatchValidation/
```

Each feature contains:
- **Controllers** - Request handling logic
- **Routes** - Express route definitions
- **Services** - Business logic
- **Repos** - Database access layer
- **Validation** - Zod schemas
- **Middlewares** - Feature-specific middleware
- **Utils** - Feature-specific utilities

### Email Batch Processing System

The core functionality revolves around batch email processing:

1. **Queue System** ([src/quenes/emailQuene.config.ts](src/quenes/emailQuene.config.ts))
   - Uses BullMQ with Redis for job queue
   - Jobs are of type `TEMAILJOB`

2. **Worker** ([src/workers/email.worker.ts](src/workers/email.worker.ts))
   - Processes email jobs with concurrency: 1
   - Implements auto-pause when batch limit reached
   - Tracks processed count in Redis
   - Applies configurable delays between emails
   - Automatically marks batches/uploads as completed

3. **Email Service** ([src/services/globalEmail.service.ts](src/services/globalEmail.service.ts))
   - Handles actual email sending via Nodemailer
   - Function: `gloabalMailMessage({ composedEmail, subject, to })`

### Database Layer

**ORM:** Drizzle with PostgreSQL

**Configuration:** [drizzle.config.ts](drizzle.config.ts)
- Migrations: `src/db/migrations/`
- Schemas: `src/db/schemas/**/*.ts` (recursive glob pattern)
- Migration table: `__drizzle_migrations__`

**Database Client:** [src/db/db.ts](src/db/db.ts)
- Singleton `Database` class with connection pooling
- Access via `database.db`
- Includes retry logic for failed operations

**Key Schemas:**
- `userSchema` - User accounts
- `emailBatchSchema` - Batch configuration and status
- `individualEmailSchema` - Individual email records
- `uploadBulkEmailMetaDataSchema` - Bulk upload metadata
- `rateLimiterSchema` - Rate limiting data

### Project Setup Workflow

1. Install Bun from https://bun.sh/docs/installation
2. Clone repository
3. Run `bun install`
4. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URI` - PostgreSQL connection string
   - `SECRET_KEY` - JWT secret
   - `HOST_EMAIL` / `HOST_EMAIL_SECRET` - Nodemailer SMTP credentials
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth
   - Other service credentials (Twilio, Stripe, etc.)
5. Ensure PostgreSQL is running
6. Run `bun run db:reset` to clear database
7. Run `bun run db:migrate` to apply migrations
8. Run `bun run dev` to start development server

Expected startup output:
```
INFO::✅ Database connected successfully
Server is running on http://localhost:8000
```

### TypeScript Configuration

- Target: ES2016
- Module: CommonJS
- Strict mode enabled
- Output: `dist/` directory
- Declaration files: `types/` directory
- Incremental compilation enabled
- No unused locals/parameters allowed

### Git Hooks

The project uses Husky for git hooks:
- **Pre-commit**: Runs lint (`bun run precommit`)
- **Commit message**: Validates with commitlint (conventional commits)
- **Pre-push**: Runs lint (`bun run pre-push`)

Lint-staged runs on `*.{ts,tsx,json}`:
- ESLint with auto-fix
- Prettier formatting
