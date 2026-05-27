# Dashboard Console Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Phase6 Dashboard UI/UX foundation so Home, Logs, and Settings feel like one usable operations console.

**Architecture:** Keep the existing Next.js App Router pages. Add a tested `dashboard-ui.ts` helper for shared UI state, add `dashboard-shell.tsx` for common navigation/header, then refit Home, Logs, and Settings to use the shell without changing backend APIs.

**Tech Stack:** Next.js, React, TypeScript, TailwindCSS, Node test runner.

---

### Task 1: Shared Dashboard UI Helpers

**Files:**
- Create: `apps/dashboard/src/app/dashboard-ui.ts`
- Create: `apps/dashboard/src/app/dashboard-ui.test.ts`
- Modify: `apps/dashboard/package.json`

- [ ] **Step 1: Write failing tests**

Create tests for `normalizeGuildId`, `countActiveFilters`, `getDashboardNavItems`, and `toGuildQueryValue`.

- [ ] **Step 2: Run the dashboard test**

Run: `pnpm --filter @discord-bot/dashboard test`

Expected: FAIL because `dashboard-ui.ts` does not exist.

- [ ] **Step 3: Implement helper functions**

Add a small helper module with no React dependency so it can run under Node test.

- [ ] **Step 4: Run the dashboard test**

Run: `pnpm --filter @discord-bot/dashboard test`

Expected: PASS.

### Task 2: App Shell And Navigation

**Files:**
- Create: `apps/dashboard/src/app/dashboard-shell.tsx`
- Modify: `apps/dashboard/src/app/page.tsx`
- Modify: `apps/dashboard/src/app/logs/logs-explorer.tsx`
- Modify: `apps/dashboard/src/app/settings/settings-panel.tsx`

- [ ] **Step 1: Add `DashboardShell`**

The shell renders a left navigation, page title, description, session status, and a consistent content area.

- [ ] **Step 2: Refit Home**

Replace the Phase card list with an operations overview and quick links for Logs and Settings.

- [ ] **Step 3: Refit Logs**

Use the shell, improve filter grouping, show active filter count, and keep realtime status visible.

- [ ] **Step 4: Refit Settings**

Use the shell, keep Guild load/save grouped, and make the loaded guild summary easier to scan.

### Task 3: Documentation And Verification

**Files:**
- Modify: `README.md`
- Add or Modify: `docs/dashboard-uiux.md`

- [ ] **Step 1: Document Phase6 dashboard goal**

Add a short note that Phase6 starts Dashboard UI/UX foundation.

- [ ] **Step 2: Run checks**

Run:

```powershell
pnpm --filter @discord-bot/dashboard typecheck
pnpm --filter @discord-bot/dashboard test
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit 0.

### Self Review

- Spec coverage: the tasks cover shared layout, Home, Logs, Settings, and docs.
- Placeholder scan: no TBD/TODO items are left in this plan.
- Type consistency: helper names are consistent across tasks.
