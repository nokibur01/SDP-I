# BatchHub — Centralized Academic Management & Collaboration Platform

BatchHub is a modern, high-performance academic management and student collaboration platform designed specifically for university cohorts. Built with a **React 19** frontend, an **Express.js** REST API, and a relational **MySQL** database, BatchHub unifies course tasks, routine schedules, announcements, study materials, and peer project recruitment into one cohesive, CR-moderated workspace.

---

## 🚀 Architecture & Port Configuration

| Service | Technology | Port / URL | Description |
| :--- | :--- | :--- | :--- |
| **Main Application** | React 19 + TypeScript + Vite + Tailwind CSS v4 | `http://localhost:3000` | Primary frontend Single Page Application (Midnight Campus theme) |
| **Backend API** | Node.js + Express.js + MySQL | `http://localhost:5000/api` | REST API with JWT authentication, rate limiting & RBAC |

---

## ⚡ Quick Start (Running the Project)

### 1. Install Dependencies
```bash
# Install root orchestration tools
npm install

# Install React client dependencies
cd client-react && npm install && cd ..

# Install Express server dependencies
cd server && npm install && cd ..
```

### 2. Configure Environment & Database
1. Copy the server environment template:
   ```bash
   cp server/.env.example server/.env
   ```
2. Configure your MySQL credentials inside `server/.env` (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`).
3. Import the database schema and versioned migrations in order:
   - `database/schema.sql`
   - `database/migrations/01_security_and_completion_fixes.sql`
   - `database/migrations/02_phase2_functional_improvements.sql`
   - `database/migrations/03_production_indexes_and_integrity.sql`
   - `database/migrations/04_resource_moderation_and_constraints.sql`
4. (Optional) Seed the realistic university demonstration dataset:
   ```bash
   npm run seed:demo
   ```

### 3. Run the Full Application
```bash
npm run dev
```
* **Frontend:** Starts Vite at `http://localhost:3000` with hot module replacement and API proxying.
* **Backend:** Starts Express at `http://localhost:5000` connected to MySQL.

---

## 🛠️ Individual Commands & Workflows

### Development
* `npm run dev` — Starts both backend API (`:5000`) and React frontend (`:3000`) concurrently.
* `npm run client` — Starts only the React development server at `http://localhost:3000`.
* `npm run server` — Starts only the Express API backend at `http://localhost:5000`.

### Production & Verification
* `npm run build` — Compiles TypeScript and creates optimized production bundles in `client-react/dist`.
* `npm run preview` — Serves the production build locally with API proxying and client-side route fallback.
* `npm test` — Executes the complete automated test suite (**164 integration, auth, role-guard, privacy, transaction integrity, and E2E production tests across 9 test suites**).
* `npm run seed:demo` — Populates realistic demonstration data for university presentation screenshots.

---

## 🔐 Demonstration Accounts

For local demonstration and presentation screenshots, the following accounts can be populated via `npm run seed:demo` (all accounts use password: **`BatchHub@123`**):

| Name | Role | Email | Student ID | Department / Batch |
| :--- | :--- | :--- | :--- | :--- |
| **Mustavi Tripto** | `student` | `tripto.demo@batchhub.test` | `24524203151` | CSE / 3rd Year |
| **Arif Hasan** | `student` | `arif.demo@batchhub.test` | `24524203152` | CSE / 3rd Year |
| **Nusrat Jahan** | `student` | `nusrat.demo@batchhub.test` | `24524203153` | CSE / 3rd Year |
| **Fahim Ahmed** | `student` | `fahim.demo@batchhub.test` | `24524203154` | CSE / 3rd Year |
| **Sakib Rahman** | `cr` | `sakib.cr@batchhub.test` | `24524203150` | CSE / 3rd Year |
| **Demo Admin** | `admin` | `admin.demo@batchhub.test` | `ADMIN-DEMO-01` | CSE / 3rd Year |

---

## 🎨 Visual Identity — Matte Dark Forest & Sage

* **Canvas Background:** `#090e0b`
* **Card / Sidebar Surface:** `#101713`
* **Card Hover:** `#141d18`
* **Elevated Surface:** `#16201a`
* **Inset Input Fields:** `#0c120e`
* **Structural Borders:** `#1b261f`
* **Primary Sage Accent:** `#95b399` (Hover: `#839f87`, button text: `#090e0b`)
* **Secondary Accent (icons):** `#4a6352`
* **Text:** Main `#d6ded8`, Muted `#78877d`
* **Priority Badges:** High `#d66767` on `#3b1c1c`, Medium `#d6b867` on `#3a321c`

---

## 📋 Core Modules & Capabilities

1. **Academic Flight Deck (Dashboard):** Real-time class schedule routines, course deadlines, interactive calendar, dynamic next class indicator, and unread notification alerts.
2. **Tasks & Deadlines:** Individual student completion tracking (`task_completions`), private student submission queues, priority badges, and CR/Admin moderation triage.
3. **Campus Events & Schedules:** Interactive calendar with day filtering, event proposals, and venue scheduling.
4. **Cohort Bulletins:** Pinned announcements, priority tagging (`Normal`, `Important`, `Urgent`), and role-restricted publishing.
5. **Project Collaboration:** Project directory with tech stack badges, repository links, member rosters, join requests, and owner team invitations.
6. **Academic Resources:** Study materials repository with lecture notes, slides, lab manuals, and question banks with CR review workflow.
7. **Members Directory:** Student search by skills, student ID, batch, and direct project invitations with student privacy safeguards.
8. **CR / Admin Panel:** Gated cohort leadership suite for approving peer submissions, adding timetable slots, and enrolling semester curriculum courses.

---

## 🧪 Automated Test Suite Verification

BatchHub includes an automated test suite verifying security, business logic, transaction atomicity, role guards, and live production endpoints:

```
Test Suites: 9 passed, 9 total
Tests:       164 passed, 164 total
Snapshots:   0 total
Time:        ~12s
```

Run tests with:
```bash
npm test
```
