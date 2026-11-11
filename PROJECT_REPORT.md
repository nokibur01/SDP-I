# BatchHub — Project Inspection Report

**Project:** BatchHub — Centralized Academic Management & Collaboration Platform (SDP-I, CSE-3206)
**Branch inspected:** `batchhub-final` (clean working tree, commit `f63b26f`)
**Inspection date:** 11 November 2026
**Scope:** Every first-party file in the repository: backend, frontend, database, tests, scripts and docs, plus the three PDFs (project proposal, SRS part 1, SRS part 2). Vendored dependencies were not reviewed.

---

## 1. Executive summary

BatchHub is a working full-stack web app: a React 19 + TypeScript single-page client, an Express 5 REST API and a MariaDB database. It covers most of the SRS. That includes authentication, three-tier RBAC (student / CR / admin), per-batch content scoping, CR moderation of student submissions, tasks with per-student completion, events, announcements, study resources, project teams with join requests and invitations, a member directory, global search, in-app notifications, an admin console and a Gemini-powered read-only assistant.

The code is generally careful. Every SQL query is parameterised, the user's role is re-checked against the database on each request, privileged routes are gated in middleware and again inside the controllers, multi-step project operations run in transactions, and the AI assistant can only read data through role-checked tools.

The inspection did find problems that should be fixed before a demo or submission:

| # | Severity | Finding |
|---|---|---|
| 1 | **Blocker (environment)** | The local database is missing migration `05_batch_scoping.sql`. `GET /api/tasks`, `/api/events`, `/api/resources` and search all return **HTTP 500** right now. The README's setup steps leave this migration out. |
| 2 | **High (security)** | Any student can change their own `batch` through `PUT /api/users/profile`. That gets around all batch scoping: they can read another batch's content and see that cohort's emails. |
| 3 | **High (workflow)** | After a student's task, event or resource is approved, the student can still edit it, and the edit is not reviewed again. This includes swapping a resource's link. |
| 4 | **High (authorization)** | A project owner can add any student to their project without that student's consent by "approving" their own invitation. |
| 5 | **High (privacy)** | `GET /api/projects/:id` returns the creator's and every member's email to any logged-in user. This undoes the directory's email masking. |
| 6 | Medium (bug) | When a CR approves a student's task or event, the batch-wide notification is silently skipped. |

The full list, with file and line references, is in [§7](#7-findings).

**Test status (run during this inspection):** 135 checks passed and 39 failed across the 10 test scripts. The README claims "164 passed, 9 suites". Most of the failures come from finding #1. The 10 browser-route failures happened because the Vite client was not running on port 3000. Details are in [§6](#6-testing--verification).

---

## 2. Project background and scope

### 2.1 Origin
- The proposal PDF (`Project idea for SDP-I.pdf`) offers two ideas, *TeamForge* and *BatchHub*. BatchHub was chosen on 13 Aug (`project-update.txt`).
- The SRS is split across `24524203119.pdf` (introduction, scope, user classes, risks) and `24524203161.pdf` (functional requirements FR-01 to FR-43 and non-functional requirements NFR-01 to NFR-20).

### 2.2 Planned vs. delivered technology

| Area | Proposal | Delivered | Note |
|---|---|---|---|
| Frontend | React, Tailwind | React 19, TypeScript, Vite 8, Tailwind v4, TanStack Query 5, Zustand 5, React Router 7 | Exceeds plan |
| Backend | Node, Express | Node 24, Express 5 (ES modules) | As planned |
| Database | **PostgreSQL + Prisma** | **MariaDB 10.4 + raw SQL (`mysql2`)** | Changed; should be justified in the report |
| File storage | Cloudinary | **None**: resources are external links only | FR-22/FR-25 only partly met |
| Testing | Jest / Supertest, Postman | Custom Node scripts against a live server | No test framework |
| Tooling | Git, GitHub, **Docker** | Git, GitHub | No Docker or deployment |
| Extra | — | Gemini AI assistant, light/dark theme, command palette | Beyond plan |

### 2.3 Team activity (git history)
- 45 commits: 38 by Mustavi Mansur Tripto and 7 by nokibur01.
- Early work by nokibur01 (Aug to Oct): project ideas, DB connection and the original student UI. Most of the current code came on 4–5 Nov (React migration, phases 1–2) and 10–11 Nov (security fixes, redesign, admin panel, batch scoping, assistant).
- 38 of the 45 commits were made in three days, so the history shows very little of the incremental development the course expects.

---

## 3. Architecture

```
┌────────────────────────┐   /api proxy    ┌──────────────────────────┐   mysql2 pool   ┌──────────────┐
│ client-react (Vite)    │ ──────────────▶ │ server (Express 5)       │ ──────────────▶ │ MariaDB      │
│ React 19 + TS + TW4    │   JWT Bearer    │ routes → middleware →    │   (10 conns)    │ batchhub_db  │
│ TanStack Query/Zustand │                 │ controllers → db         │                 │ 14 tables    │
│ :3000                  │                 │ :5000                    │ ──fetch──▶ Google Gemini API │
└────────────────────────┘                 └──────────────────────────┘                 └──────────────┘
```

**Repository layout**

| Path | Contents | Size |
|---|---|---|
| `server/src/` | `server.js`, 1 DB config, 2 middleware, 12 controllers, 12 routers, 2 services (Gemini, chat tools), 1 util (`batchScope.js`) | ~3,900 lines |
| `server/test/` | 10 test scripts + helper | ~2,800 lines |
| `server/scripts/` | `run_migration.js`, `seed_demo_data.js` | ~790 lines |
| `client-react/src/` | 11 views, 13 UI primitives, 5 layout components, 5 chatbot components, 3 stores, 2 services | ~9,800 lines |
| `database/` | `schema.sql`, 5 migrations, `seed.sql`, `demo_seed.sql` | ~550 lines |
| Docs | `README.md`, `PRODUCT.md`, `DESIGN.md`, `client-react/README.md` | |
| Tooling artefacts | `.agent/skills/impeccable/` (AI design skill), `.impeccable/` (critique logs) | not app code |

**Backend design.** The backend follows a layered MVC pattern. `verifyToken` checks the JWT and then reloads `role`, `batch` and `department` from the database, so role changes and deletions take effect immediately. `requireRole(...)` gates routes. `utils/batchScope.js` holds the visibility and moderation rules in one place, and most controllers reuse it. The exception is `userRoutes.js`, where the admin endpoints contain SQL directly in the route handlers instead of a controller.

**Frontend design.** `App.tsx` defines public routes (`/login`, `/register`) and protected routes (`/dashboard`, `/tasks`, `/events`, `/announcements`, `/projects`, `/resources`, `/members`, `/profile`). `/cr-panel` is limited to CR and admin, and `/admin/batches` to admin. Server data is loaded with TanStack Query. The auth token and user object are persisted in `localStorage` by Zustand.

---

## 4. Feature inventory and requirement traceability

Status key: ✅ done · 🟡 partial · ❌ missing

| SRS ref | Requirement | Status | Evidence / gap |
|---|---|---|---|
| FR-01–05 | Register, login, validation, rejection of bad credentials | ✅ | `authController.js`. Public sign-up is always forced to `student` and gives a generic error on bad credentials |
| FR-04 | Logout | 🟡 | Client-side only. The JWT stays valid for 7 days because there is no revocation |
| FR-06–08 | View and edit profile, avatar, access control | ✅ | `userController.js`. Avatars are validated and size-capped. *But see finding #2: `batch` can be edited* |
| FR-09–11 | Roles, permissions, admin management | ✅ | 3 roles, admin console (`AdminDashboardView.tsx`), role changes, deletion. The proposal's "Teacher" role is not implemented |
| FR-12–16 | Course management | 🟡 | `semester_courses` CRUD in `academicController.js`. The UI can add and delete but not edit. Notices are not linked to courses |
| FR-17–21 | Notices: create, view, edit, delete, categorise | 🟡 | Create, view, delete, pin, priority and category all work. Editing exists on the API only, with no UI |
| FR-22–27 | Course materials: upload, metadata, download, manage | 🟡 | Link-only: no file upload or storage. Moderation (pending, approved, rejected, with reason) works well. Editing is API-only |
| FR-28–34 | Projects and groups | 🟡 | Create, list, join request, invite, accept or decline and delete all work. **No UI for team roster, removing members, leaving a project or editing a project.** Project tasks and files are not implemented |
| FR-35–38 | Search and filtering | ✅ | `searchController.js` plus the command palette. The member directory has batch, department and role filters. Projects are not scoped by batch |
| FR-39–43 | Notifications | ✅ | Created on posts, approvals, requests and invitations. Read/unread, mark-all and 30-second polling work. *See finding #6* |
| — | Class routine | ✅ | CR adds and deletes slots. Duplicate room or batch slots are blocked by unique indexes |
| — | Task tracking with per-student completion | ✅ | `task_completions` table. Shared tasks are never deleted when one student completes them |
| — | CR moderation queue | ✅ | `/cr-panel` for tasks, events and resources, scoped to the CR's own batch |
| — | AI assistant (beyond scope) | ✅ | 10 read-only tools, role-filtered declarations, server-side identity, model fallback |
| SRS-119 | Discussions, polls, team matching, academic insights | ❌ | Not implemented. The assistant partly covers "smart assistance" |
| NFR-03/04 | Secure auth, hashed passwords | ✅ | bcrypt (cost 10), startup check that `JWT_SECRET` is strong |
| NFR-05/19 | Access control and privacy | 🟡 | Strong in most places, with gaps in findings #2, #4, #5 and #8 |
| NFR-06 | HTTPS | ❌ | No deployment or TLS configuration |
| NFR-09/12 | Friendly errors, no internal details leaked | 🟡 | A global error handler exists, but several controllers return `error.message` to the client (finding #10) |
| NFR-10 | Responsive UI | ✅ | Responsive Tailwind layout with a collapsible sidebar |
| NFR-13 | Data consistency | ✅ | Foreign keys, unique constraints and transactions for project membership |
| NFR-14 | Backup and recovery | ❌ | Nothing provided |
| NFR-17/18 | Modular, maintainable code | 🟡 | Good separation on the backend. Frontend views are very large (`DashboardView.tsx` is 1,010 lines) |

---

## 5. Database

**Engine.** The schema needs **MariaDB**. `schema.sql` and the migrations use `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` and `DROP COLUMN IF EXISTS`, which MySQL 8 does not support. `README.md` and `PRODUCT.md` describe the database as "MySQL 8.x" compatible, which is wrong. The local server is MariaDB 10.4.32.

**Tables (14):** `users`, `semester_courses`, `routines`, `tasks`, `task_completions`, `events`, `notices`, `materials`, `projects`, `project_members`, `project_requests`, `notifications`, `rate_limits`, and the legacy `courses`.

**Strengths**
- Foreign keys with sensible `CASCADE` and `SET NULL` rules.
- `UNIQUE(user_id, task_id)` on completions and `UNIQUE(project_id, user_id)` on members.
- Unique timetable indexes block double-booking a room or a batch at the same time.
- Moderation audit columns (`reviewed_by`, `reviewed_at`, `rejection_reason`).
- Indexes for status, date and batch queries.

**Weaknesses**
- `schema.sql` is not a clean schema. It is a running log of `CREATE`, `ALTER` and `UPDATE` statements (it even drops and re-adds `events.batch`), and it repeats the migrations. A fresh install runs everything twice.
- Dead schema: the `courses` table, `materials.course_id` and `materials.file_path` are never used by the server. `projects.team_members` is a comma-separated copy of `project_members` that has to be kept in sync by hand.
- `routines.time_slot` is free text, so conflict detection is exact string equality. `"9:00-10:00"` and `"9:30-10:30"` do not count as overlapping.
- `uq_routines_slot (batch, day, time, room)` is redundant, because the two narrower unique indexes already cover it.
- `materials.course_code` is joined to `semester_courses.course_code` without a batch condition. If two batches register the same course code, each resource appears **twice** in listings (`resourceController.js:18`).
- Migration 05 has not been applied to the local database (finding #1), and the README's list of migrations stops at 04.

---

## 6. Testing & verification

### 6.1 What was run

| Check | Result |
|---|---|
| `tsc -b` (client type-check) | ✅ 0 errors |
| `oxlint` (client) | ✅ 0 errors, 15 warnings (React-compiler memoisation, `Date` called during render, hook dependency arrays), mostly in `DashboardView.tsx` |
| Backend test scripts (10) against the running API on :5000 | **135 checks passed, 39 failed** |

| Suite | Failures | Cause |
|---|---|---|
| `dashboard_fixes` | 2 | `/tasks` and `/events` return 500 (missing `batch` column) |
| `tasks_phase_implementation` | 6 | Same |
| `security_and_auth` | 11 | Same (task and event flows) |
| `phase2_features` | 3 | Search queries the missing `batch` columns |
| `backend_gap_completion` | 3 | Same |
| `production_readiness`, `final_improvements`, `reliability_and_transactions` | 1 each | Resource and timetable flows that touch the same tables |
| `chatbot` | **0** | All pass (Gemini is mocked) |
| `e2e_browser_routes_and_roles` | 11 | 10 because the Vite client was not running on :3000; 1 DB persistence check |

I confirmed directly against the database that `tasks`, `events` and `materials` have no `batch` column and that the server's queries fail with `Unknown column 't.batch'`. To reproduce: `npm --prefix server run migrate -- 05_batch_scoping.sql`, start the client, then run `npm test`. I did not apply the migration, because that changes your database and is your decision.

### 6.2 Test-suite quality
- **Not a real test framework.** Each file has its own `assert` and `test` helpers and calls a *live* server and a *live* development database over HTTP. They are integration scripts, not unit tests, and the proposal's Jest/Supertest was never adopted.
- **They change the development database.** They create test users, tasks, events and so on with no clean-up, and edit the profile of user id 1. They assume that users with ids 1 and 2 exist.
- Several scripts sign JWTs with a fallback secret `"default_jwt_secret"` and with batch values that the server then replaces with the real ones from the database. The tests' assumptions can therefore silently diverge from what the server actually does.
- `axios` is a **production** dependency of the server but only the tests use it.
- The README's sample output ("Test Suites: 9 passed… Tests: 164 passed… Time ~12s") looks like Jest output. No Jest is used, `npm test` runs 10 scripts, and the count does not match this run. That claim should be corrected before submission.
- Nothing tests the bugs in findings #2–#7.

---

## 7. Findings

References are file and line in the current tree.

### High

**#1 Migration 05 missing → core pages return 500 (environment and docs)**
- Every query that uses `batchScope.js` references `tasks.batch`, `events.batch` or `materials.batch`. Those columns do not exist in the local database, so Tasks, Events, Resources, Search, the Dashboard deadline and event widgets and the CR moderation queues all fail.
- `README.md` §2 lists migrations 01–04 only.
- *Fix:* apply `05_batch_scoping.sql`, then add it to the README.

**#2 Students can move themselves into any batch** ([userController.js:80-90](server/src/controllers/userController.js#L80-L90))
- `updateProfile` stops CRs from changing their batch, but it accepts any `batch` and `department` from a student.
- Because `verifyToken` reloads the batch from the database, the change applies to the very next request. The student then sees that batch's tasks, events, resources and announcements, sees full emails for that cohort, and receives its notifications.
- Registration also lets anyone pick any batch, so batch membership is self-declared and never verified.
- *Fix:* make `batch` and `department` read-only for every non-admin, or require CR/admin approval to change them.

**#3 Approved content can be edited without re-moderation**
- Locations: [taskController.js:259-306](server/src/controllers/taskController.js#L259-L306), [eventController.js:217-262](server/src/controllers/eventController.js#L217-L262), [resourceController.js:185-227](server/src/controllers/resourceController.js#L185-L227).
- The owner check allows edits whatever the item's `status`. A student can submit a harmless resource, get it approved, and then change `file_url` to any link, or change the title and date of a task the whole batch relies on.
- Owners can also delete approved shared tasks and events.
- *Fix:* when a non-staff owner edits an approved item, reset it to `pending`, or only allow owners to edit while it is still pending.

**#4 Owner can force-add a student to a project** ([projectController.js:325-411](server/src/controllers/projectController.js#L325-L411))
- `approveJoinRequest` does not check `request_type = 'join_request'`.
- An owner can call `POST /projects/:id/invite`, take the returned `invitationId`, and call `PUT /projects/requests/:invitationId/approve`. The invited student becomes a member without accepting.
- *Fix:* add `AND pr.request_type = 'join_request'` to the lookup, and apply the same check in `rejectJoinRequest`.

**#5 Project details leak email addresses** ([projectController.js:73-107](server/src/controllers/projectController.js#L73-L107))
- `getProjectDetails` returns `creator_email` and every member's `email` to any signed-in user, from any batch.
- The member directory, search and assistant all mask those same addresses.
- Projects are also not batch-scoped anywhere.
- *Fix:* apply the directory's `canViewEmail` rule here.

### Medium

**#6 Batch notification skipped on approval** ([notificationController.js:296-308](server/src/controllers/notificationController.js#L296-L308))
- In `approveTask` and `approveEvent`, `createNotification` first writes a notification for the submitter, using the same `type` and entity.
- `broadcastNotification`'s duplicate check then finds that row from within the last minute and returns early.
- Result: when a CR approves a student's submission, nobody in the batch except the submitter is notified.
- *Fix:* exclude the submitter's notification from the check (for example, check `user_id != excludeUserId`), or broadcast first.

**#7 Duplicate-task check is global** ([taskController.js:88-101](server/src/controllers/taskController.js#L88-L101))
- The check is not filtered by batch. If batch A has "Lab 3 Report / CSE-3206 / date", batch B gets a **409** for the identical task.
- *Fix:* add `AND batch <=> ?`.

**#8 CR sees every batch's pending materials** ([academicController.js:24-32](server/src/controllers/academicController.js#L24-L32))
- `GET /api/academic` returns all pending materials to any CR, with no moderation clause.
- That query also swallows errors (`catch (e) {}`).

**#9 Rate limiter can be bypassed** ([rateLimiter.js:19-28](server/src/middleware/rateLimiter.js#L19-L28))
- The client IP is taken from `X-Forwarded-For` as given. An attacker can send a new value on every request and avoid the login and chat limits completely.
- The limiter also *fails open* on error. The default is 50 login attempts per 15 minutes per IP.
- *Fix:* use Express `trust proxy` together with `req.ip`, and key login attempts by email as well.

**#10 Internal errors returned to the client**
- `resourceController.js`, `noticeController.js` and `academicController.js` respond with `{ error: error.message }`. That exposes SQL and driver messages (the "Unknown column" errors above reach the browser).
- This contradicts the comment on the global handler in `server.js`.

**#11 User-supplied URLs are not validated**
- `materials.file_url` and `projects.repo_url` accept any string and are rendered directly as `<a href>` in `ResourcesView.tsx:318`, `CRPanelView.tsx:356` and `ProjectsView.tsx:424`.
- React 19 blocks `javascript:` URLs, which limits the damage, but the server should accept only `http(s)` links.

**#12 Duplicate resource rows**
- Covered in §5: the join on `course_code` has no batch condition.

### Low / hardening

- **Input validation gaps on update:** non-enum `priority` or `category` values, a non-string `description` (`.trim()` throws), and an unvalidated `event_date` all end in a 500 instead of a 400. `createEvent` accepts past dates; `createTask` rejects them.
- **Approval races:** approve and reject read `status` outside the transaction without `SELECT … FOR UPDATE`. Two quick approvals can add the member's name to `team_members` twice.
- **Duplicate endpoints:**
  - Two role-change endpoints (`PUT /users/:id/role` and `PUT /users/admin/users/:id/role`). Only the second stops an admin from changing their own role.
  - Two material-approve endpoints (`/academic/materials/:id/approve` and `/resources/:id/approve`). The academic one skips the notification and the batch-aware audit.
  - `approveResource` re-approves already rejected items without checking `status`.
- **Session handling:** the JWT is stored in `localStorage` under two keys (`token` and `batchhub-auth`), lasts 7 days, and is not revoked when the password changes. The minimum password length is 6.
- **No security headers** (no `helmet`). CORS allows *any* `localhost` origin, including in production.
- **Performance:** `GET /api/members` is unpaginated and returns every user's base64 avatar (up to 1.5 MB each). The login response and the persisted user object include the avatar too.
- **Search** uses `LIKE '%…%'` without escaping `%` and `_`. Its email rule (same batch) differs slightly from the directory's (same batch *and* department).
- **Assistant:** the client supplies the chat history, so a user can invent earlier "assistant" turns. The impact is low because every data access is enforced server-side. Student data, including permitted emails, is sent to Google's API, which should be stated in a privacy note.

### Repository hygiene and documentation

- **`server/node_modules` is committed (1,270 files)** even though `.gitignore` lists `node_modules/`; it was added before the ignore rule. Remove it with `git rm -r --cached server/node_modules`.
- PDFs, a design reference PNG and AI-tool folders (`.agent/`, `.impeccable/`) are committed alongside the code.
- **Documentation drift:**
  - `PRODUCT.md` and `DESIGN.md` still describe the old "Midnight Campus" emerald palette (`#00D084`), while the README and UI use the forest and sage palette. The README also still calls the frontend "Midnight Campus theme".
  - `PRODUCT.md` says "4 versioned migration files"; there are 5.
  - The test-count claim is covered in §6.2.
- `seed.sql` contains placeholder bcrypt hashes, so its users cannot log in; only `npm run seed:demo` produces working accounts. That difference is not documented.
- **Frontend maintainability:**
  - The same endpoint is cached under several query keys (`tasks-list`, `dashboard-tasks`, `cr-tasks`), so every mutation has to invalidate each one by hand.
  - There is no typed API layer per module.
  - The views are very large: Dashboard 1,010 lines, Tasks 889, CR panel 767.

---

## 8. Strengths worth highlighting in the report

1. **Consistent parameterised SQL.** No string-built user input anywhere. The only interpolated identifiers come from a fixed allow-list (`userRoutes.js:164-171`).
2. **Privilege escalation handled properly.** Public sign-up is forced to `student`, the role is re-read from the database on every request, and admins cannot delete or demote themselves.
3. **Centralised batch-scoping rules** (`batchScope.js`) reused across controllers and the assistant's tools.
4. **Moderation keeps an audit trail.** Rejections set a status instead of deleting, and resources record who reviewed them, when and why.
5. **Transactions where they matter.** Project creation, accepting a join request or invitation and removing a member each run as one atomic operation.
6. **Well-built AI assistant.** The key stays on the server, the user's identity comes from the token, tools are filtered by role and checked again when they run, results are trimmed and read-only, the Markdown renderer cannot inject HTML, the model has a fallback chain, and errors are mapped to friendly messages.
7. **Startup checks** refuse to boot with a missing or default `JWT_SECRET`, or with an empty database password in production.
8. **Polished UI:** a design system with tokens, light and dark themes, skeleton loaders, toasts, a command palette, and role-aware navigation.

---

## 9. Recommended next steps (priority order)

1. Apply migration 05, add it to the README, then re-run `npm test` with the client running and record the real numbers.
2. Lock `batch` and `department` for students (#2).
3. Send edited approved content back to `pending` (#3).
4. Add the `request_type` check (#4) and mask emails in project details (#5).
5. Fix the broadcast duplicate check (#6), the global duplicate-task check (#7) and the CR pending-materials leak (#8).
6. Replace `error: error.message` responses with generic messages, and validate URLs and enum values on the server.
7. Make the rate limiter use `trust proxy` and also key login attempts by email; add `helmet`.
8. Untrack `server/node_modules`, and rewrite `schema.sql` as one clean schema plus migrations.
9. Update `PRODUCT.md`, `DESIGN.md` and the README so the palette, database engine, migration count and test claims match the code.
10. Optionally, to close SRS gaps: file upload for resources, UI for editing tasks, events, notices, resources and projects and for managing project members, HTTPS deployment and a backup procedure.
