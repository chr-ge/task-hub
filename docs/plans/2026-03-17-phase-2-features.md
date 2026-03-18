# Phase 2 Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add task phases, drip feed, bulk upload, worker earnings, and worker past submissions to the existing micro-task platform.

**Architecture:** Extend the existing domain model (Zod schemas in `types.ts`), repository layer (`lib/repositories/`), and TanStack Query hooks (`features/*/hooks.ts`). New UI surfaces are added as pages or feature components. All data persists in localStorage with simulated async delays.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, TanStack Table, Zod 4, react-hook-form 7, nuqs 2, lucide-react

---

## Current State Summary

### Domain Model (`src/lib/types.ts`)
- **Task**: id, task_type, title, description, details, amount, reward, allow_multiple_submissions, campaign_id, timestamps, deleted_at
- **Submission**: id, task_id, user_id, status, data (discriminated union), submitted_at, reviewed_at
- **User**: id, name, email, role, avatar_url

### Existing Files
- **Types/Schemas**: `src/lib/types.ts`
- **Storage**: `src/lib/storage.ts`, `src/lib/delay.ts`
- **Repositories**: `src/lib/repositories/tasks.ts`, `submissions.ts`, `users.ts`, `index.ts`
- **Seed**: `src/lib/seed.ts` (SEED_VERSION=2, 25 tasks, 60 submissions, 6 users)
- **Task hooks**: `src/features/tasks/hooks.ts`
- **Submission hooks**: `src/features/submissions/hooks.ts`
- **Task composer**: `src/features/tasks/task-composer.tsx`
- **Admin tasks page**: `src/app/(authenticated)/admin/tasks/page.tsx`
- **Admin submissions page**: `src/app/(authenticated)/admin/submissions/page.tsx`
- **Worker tasks page**: `src/app/(authenticated)/user/page.tsx`
- **App shell**: `src/components/shared/app-shell.tsx` (nav: admin has Tasks+Submissions, worker has Tasks only)
- **Auth**: `src/features/auth/auth-context.tsx`

### What Phase 2 Adds
1. **Task phases** — optional sequential phases within a task, each with its own slots/reward/instructions
2. **Drip feed** — task-level config that releases slots over time
3. **Bulk upload** — paste/import flow in task composer with preview + validation
4. **Worker earnings** — dashboard showing earnings with optimistic updates
5. **Worker past submissions** — history screen with filtering/sorting

---

## Task 1: Extend Domain Types

**Files:**
- Modify: `src/lib/types.ts`

### Step 1: Add Phase schema

Add after the TaskFormValues section in `src/lib/types.ts`:

```typescript
// ---------------------------------------------------------------------------
// Task Phase
// ---------------------------------------------------------------------------

export const TaskPhaseSchema = z.object({
  id: z.string().uuid(),
  phase_name: z.string().min(1, "Phase name is required"),
  phase_index: z.number().int().nonnegative(),
  slots: z.number().int().positive("Slots must be at least 1"),
  instructions: z.string(),
  reward: z.number().nonnegative(),
});

export type TaskPhase = z.infer<typeof TaskPhaseSchema>;

export const TaskPhaseFormValuesSchema = TaskPhaseSchema.omit({ id: true });
export type TaskPhaseFormValues = z.infer<typeof TaskPhaseFormValuesSchema>;
```

### Step 2: Add DripFeed schema

```typescript
// ---------------------------------------------------------------------------
// Drip Feed
// ---------------------------------------------------------------------------

export const DripFeedConfigSchema = z.object({
  drip_enabled: z.boolean(),
  drip_amount: z.number().int().positive().optional(),
  drip_interval: z.number().int().positive().optional(), // in minutes
});

export type DripFeedConfig = z.infer<typeof DripFeedConfigSchema>;

export const DripFeedStateSchema = z.enum(["active", "waiting", "completed"]);
export type DripFeedState = z.infer<typeof DripFeedStateSchema>;
```

### Step 3: Extend Task schema with phases and drip feed

Add new optional fields to `TaskSchema`:

```typescript
export const TaskSchema = z.object({
  id: z.string().uuid(),
  task_type: TaskTypeSchema,
  title: z.string(),
  description: z.string(),
  details: z.string(),
  amount: z.number().int().nonnegative(),
  reward: z.number().nonnegative(),
  allow_multiple_submissions: z.boolean(),
  campaign_id: z.string().uuid(),
  // Phase 2 fields
  phases: z.array(TaskPhaseSchema).default([]),
  drip_feed: DripFeedConfigSchema.default({ drip_enabled: false }),
  drip_last_released_at: z.string().datetime().nullable().default(null),
  drip_released_count: z.number().int().nonnegative().default(0),
  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});
```

Update `TaskFormValuesSchema` to include the new fields:

```typescript
export const TaskFormValuesSchema = TaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  drip_last_released_at: true,
  drip_released_count: true,
});
```

### Step 4: Add phase_id to Submission schema

```typescript
export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  phase_id: z.string().uuid().nullable().default(null), // null for non-phased tasks
  user_id: z.string().uuid(),
  status: SubmissionStatusSchema,
  data: SubmissionDataSchema,
  submitted_at: z.string().datetime(),
  reviewed_at: z.string().datetime().nullable(),
});
```

Update `SubmissionFormValuesSchema`:

```typescript
export const SubmissionFormValuesSchema = SubmissionSchema.omit({
  id: true,
  user_id: true,
  status: true,
  submitted_at: true,
  reviewed_at: true,
});
```

### Step 5: Verify build

Run: `cd /Users/george.christeas/Repositories/task-hub && npx next build 2>&1 | tail -30`
Expected: May have type errors in files that reference Task/Submission — those are fixed in the next tasks.

### Step 6: Commit

```bash
git add src/lib/types.ts
git commit -m "feat: extend domain types with phases, drip feed, and phase_id on submissions"
```

---

## Task 2: Add Derived Helpers

**Files:**
- Create: `src/lib/derived.ts`

### Step 1: Create derived helpers module

Create `src/lib/derived.ts` with all Phase 2 calculation logic:

```typescript
import type { Task, TaskPhase, Submission, DripFeedState } from "./types";

// ---------------------------------------------------------------------------
// Phase helpers
// ---------------------------------------------------------------------------

/** Get the active phase for a task. Returns null if task has no phases. */
export function getActivePhase(task: Task, submissions: Submission[]): TaskPhase | null {
  if (task.phases.length === 0) return null;

  const sorted = [...task.phases].sort((a, b) => a.phase_index - b.phase_index);

  for (const phase of sorted) {
    const approvedCount = submissions.filter(
      (s) => s.phase_id === phase.id && s.status === "approved"
    ).length;
    if (approvedCount < phase.slots) return phase;
  }

  // All phases completed — return last phase
  return sorted[sorted.length - 1];
}

/** Get phase completion progress. */
export function getPhaseProgress(
  phase: TaskPhase,
  submissions: Submission[]
): { approved: number; pending: number; rejected: number; total: number; isComplete: boolean } {
  const phaseSubs = submissions.filter((s) => s.phase_id === phase.id);
  const approved = phaseSubs.filter((s) => s.status === "approved").length;
  const pending = phaseSubs.filter((s) => s.status === "pending").length;
  const rejected = phaseSubs.filter((s) => s.status === "rejected").length;
  return {
    approved,
    pending,
    rejected,
    total: phaseSubs.length,
    isComplete: approved >= phase.slots,
  };
}

/** Check if all phases of a task are complete. */
export function areAllPhasesComplete(task: Task, submissions: Submission[]): boolean {
  if (task.phases.length === 0) return false;
  return task.phases.every((phase) => {
    const approved = submissions.filter(
      (s) => s.phase_id === phase.id && s.status === "approved"
    ).length;
    return approved >= phase.slots;
  });
}

/** Get phases visible to a specific worker (active + phases they submitted to). */
export function getWorkerVisiblePhases(
  task: Task,
  submissions: Submission[],
  userId: string
): TaskPhase[] {
  if (task.phases.length === 0) return [];

  const activePhase = getActivePhase(task, submissions);
  const userSubmittedPhaseIds = new Set(
    submissions
      .filter((s) => s.user_id === userId && s.phase_id !== null)
      .map((s) => s.phase_id)
  );

  return task.phases
    .filter((p) => p.id === activePhase?.id || userSubmittedPhaseIds.has(p.id))
    .sort((a, b) => a.phase_index - b.phase_index);
}

// ---------------------------------------------------------------------------
// Drip feed helpers
// ---------------------------------------------------------------------------

/** Calculate the current drip feed state for a task. */
export function getDripFeedState(task: Task): DripFeedState {
  if (!task.drip_feed.drip_enabled) return "completed";

  const activeSlots = getActivePhaseTotalSlots(task);
  if (task.drip_released_count >= activeSlots) return "completed";

  if (!task.drip_last_released_at) return "active"; // First release

  const interval = (task.drip_feed.drip_interval ?? 360) * 60 * 1000; // minutes to ms
  const elapsed = Date.now() - new Date(task.drip_last_released_at).getTime();

  return elapsed >= interval ? "active" : "waiting";
}

/** Get total slots for the active phase (or task.amount if no phases). */
function getActivePhaseTotalSlots(task: Task): number {
  if (task.phases.length === 0) return task.amount;
  // Use sum of all phase slots as total
  return task.phases.reduce((sum, p) => sum + p.slots, 0);
}

/** Get the number of currently available (released) slots. */
export function getReleasedSlots(task: Task): number {
  if (!task.drip_feed.drip_enabled) {
    return getActivePhaseTotalSlots(task);
  }
  return Math.min(task.drip_released_count, getActivePhaseTotalSlots(task));
}

/** Get time until next drip release (ms). Returns 0 if ready or drip not enabled. */
export function getTimeUntilNextRelease(task: Task): number {
  if (!task.drip_feed.drip_enabled || !task.drip_last_released_at) return 0;

  const interval = (task.drip_feed.drip_interval ?? 360) * 60 * 1000;
  const elapsed = Date.now() - new Date(task.drip_last_released_at).getTime();
  return Math.max(0, interval - elapsed);
}

/** Get drip progress info for display. */
export function getDripProgress(task: Task): {
  state: DripFeedState;
  releasedSlots: number;
  totalSlots: number;
  nextReleaseIn: number; // ms
  dripAmount: number;
  dripIntervalMinutes: number;
} {
  const totalSlots = getActivePhaseTotalSlots(task);
  return {
    state: getDripFeedState(task),
    releasedSlots: getReleasedSlots(task),
    totalSlots,
    nextReleaseIn: getTimeUntilNextRelease(task),
    dripAmount: task.drip_feed.drip_amount ?? 5,
    dripIntervalMinutes: task.drip_feed.drip_interval ?? 360,
  };
}

// ---------------------------------------------------------------------------
// Worker earnings helpers
// ---------------------------------------------------------------------------

/** Calculate total approved earnings for a worker. */
export function getWorkerEarnings(
  userId: string,
  submissions: Submission[],
  tasks: Task[]
): { total: number; pending: number; approved: number } {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  let approved = 0;
  let pending = 0;

  for (const sub of submissions) {
    if (sub.user_id !== userId) continue;
    const task = taskMap.get(sub.task_id);
    if (!task) continue;

    // For phased tasks, use the phase reward
    const reward = sub.phase_id
      ? (task.phases.find((p) => p.id === sub.phase_id)?.reward ?? task.reward)
      : task.reward;

    if (sub.status === "approved") {
      approved += reward;
    } else if (sub.status === "pending") {
      pending += reward;
    }
  }

  return { total: approved + pending, pending, approved };
}
```

### Step 2: Verify build

Run: `npx next build 2>&1 | tail -20`

### Step 3: Commit

```bash
git add src/lib/derived.ts
git commit -m "feat: add derived helpers for phases, drip feed, and worker earnings"
```

---

## Task 3: Update Repositories

**Files:**
- Modify: `src/lib/repositories/tasks.ts`
- Modify: `src/lib/repositories/submissions.ts`
- Modify: `src/lib/repositories/index.ts`

### Step 1: Update task repository

In `src/lib/repositories/tasks.ts`, update `createTask` to include Phase 2 defaults:

```typescript
export async function createTask(values: TaskFormValues): Promise<Task> {
  await simulateWriteDelay();
  const now = new Date().toISOString();
  const task: Task = {
    ...values,
    id: uuidv4(),
    phases: values.phases ?? [],
    drip_feed: values.drip_feed ?? { drip_enabled: false },
    drip_last_released_at: null,
    drip_released_count: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);
  return task;
}
```

Add a `bulkCreateTasks` function for bulk upload:

```typescript
export async function bulkCreateTasks(
  valuesList: TaskFormValues[]
): Promise<Task[]> {
  await simulateWriteDelay();
  const now = new Date().toISOString();
  const tasks = readTasks();
  const created: Task[] = [];

  for (const values of valuesList) {
    const task: Task = {
      ...values,
      id: uuidv4(),
      phases: values.phases ?? [],
      drip_feed: values.drip_feed ?? { drip_enabled: false },
      drip_last_released_at: null,
      drip_released_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    tasks.push(task);
    created.push(task);
  }

  writeTasks(tasks);
  return created;
}
```

Add `simulateDripRelease` for advancing drip state:

```typescript
export async function simulateDripRelease(taskId: string): Promise<Task> {
  await simulateWriteDelay();
  const tasks = readTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) throw new Error(`Task with id "${taskId}" not found`);

  const task = tasks[index];
  const dripAmount = task.drip_feed.drip_amount ?? 5;

  const updated: Task = {
    ...task,
    drip_released_count: task.drip_released_count + dripAmount,
    drip_last_released_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  tasks[index] = updated;
  writeTasks(tasks);
  return updated;
}
```

### Step 2: Update submission repository

In `src/lib/repositories/submissions.ts`, add `getSubmissionsByPhase`:

```typescript
export async function getSubmissionsByPhase(
  phaseId: string
): Promise<Submission[]> {
  await simulateReadDelay();
  const submissions = readSubmissions();
  return submissions.filter((s) => s.phase_id === phaseId);
}
```

### Step 3: Update repository index

In `src/lib/repositories/index.ts`, re-export new functions:

```typescript
export {
  // existing...
  bulkCreateTasks,
  simulateDripRelease,
} from "./tasks";

export {
  // existing...
  getSubmissionsByPhase,
} from "./submissions";
```

### Step 4: Verify build, commit

```bash
git add src/lib/repositories/
git commit -m "feat: update repositories with bulk create, drip release, and phase queries"
```

---

## Task 4: Update Seed Data

**Files:**
- Modify: `src/lib/seed.ts`

### Step 1: Add phased tasks to seed

Update `SEED_VERSION` to `3`.

Add 3-4 tasks with phases and 1-2 with drip feed enabled in the `taskSeeds` array. Give some existing tasks phases.

For the seed tasks that get phases, generate phase objects with `uuidv4()` IDs. Update `buildSubmissions()` to assign `phase_id` to submissions for phased tasks.

Key changes:
- Add `phases` and `drip_feed` fields to `TaskSeed` interface
- Generate phase IDs in the seed
- Assign `phase_id` on submissions for phased tasks
- Ensure non-phased tasks have `phase_id: null` on their submissions

### Step 2: Verify, commit

```bash
git add src/lib/seed.ts
git commit -m "feat: update seed data with phased tasks and drip feed examples (SEED_VERSION=3)"
```

---

## Task 5: Update TanStack Query Hooks

**Files:**
- Modify: `src/features/tasks/hooks.ts`
- Modify: `src/features/submissions/hooks.ts`

### Step 1: Add new task hooks

```typescript
export function useBulkCreateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (valuesList: TaskFormValues[]) => bulkCreateTasks(valuesList),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tasks created");
    },
    onError: () => {
      toast.error("Failed to create tasks");
    },
  });
}

export function useSimulateDripRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => simulateDripRelease(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
```

### Step 2: Add submission phase hook

```typescript
export function useSubmissionsByPhase(phaseId: string) {
  return useQuery({
    queryKey: ["submissions", "phase", phaseId],
    queryFn: () => getSubmissionsByPhase(phaseId),
    enabled: !!phaseId,
  });
}
```

### Step 3: Update createSubmission to include optimistic earnings

In `useCreateSubmission`, add optimistic update logic for the submissions query to include the new submission immediately in the cache with `status: "pending"`, so earnings appear instantly.

### Step 4: Verify, commit

```bash
git add src/features/tasks/hooks.ts src/features/submissions/hooks.ts
git commit -m "feat: add hooks for bulk create, drip release, phase submissions, and optimistic updates"
```

---

## Task 6: Update Task Composer — Phases

**Files:**
- Modify: `src/features/tasks/task-composer.tsx`

### Step 1: Add phase editor section

After the existing form fields, add a "Phases" section that:
- Shows a toggle/switch: "Enable Phases"
- When enabled, shows a list of phase rows, each with:
  - Phase name (text input)
  - Slots (number input)
  - Reward (number with $ prefix)
  - Instructions (textarea, collapsible)
  - Remove button
- "Add Phase" button at the bottom
- Phase index is derived from array position (auto-numbered)
- Each phase gets a `uuidv4()` ID when added

Use `useFieldArray` from react-hook-form for managing the phases array.

### Step 2: Add drip feed section

After phases, add:
- Switch: "Enable Drip Feed"
- When enabled:
  - Drip Amount (number input, default 5)
  - Drip Interval (number input in minutes, default 360, with helper text "minutes between releases")

### Step 3: Update form defaults

In `getDefaults()`, add:
```typescript
phases: task?.phases ?? [],
drip_feed: task?.drip_feed ?? { drip_enabled: false },
```

### Step 4: Verify build, commit

```bash
git add src/features/tasks/task-composer.tsx
git commit -m "feat: add phase configuration and drip feed settings to task composer"
```

---

## Task 7: Update Admin Tasks Page — Phase & Drip Display

**Files:**
- Modify: `src/app/(authenticated)/admin/tasks/page.tsx`

### Step 1: Add phase indicator column to table

Add a column after "Campaign" that shows:
- Non-phased tasks: "—"
- Phased tasks: compact badge like "3 phases" with a small stepper showing completion state (green/yellow/gray dots)

### Step 2: Add drip feed indicator

Add a column or inline indicator:
- Non-drip tasks: "—"
- Drip tasks: Badge showing state ("Active", "Waiting", "Completed") with released/total count

### Step 3: Update TaskDetailPanel

Enhance the detail panel to show:
- **Phase progress section** with a stepper/timeline:
  - Each phase as a step with: name, slots filled/total, active/completed/upcoming state
  - Color coding: green for completed, amber/blue for active, gray for upcoming
- **Drip feed section**:
  - Progress bar showing released vs total slots
  - State badge (Active/Waiting/Completed)
  - Next release info when in "waiting" state
  - Release amount and interval

### Step 4: Verify, commit

```bash
git add src/app/\\(authenticated\\)/admin/tasks/page.tsx
git commit -m "feat: add phase progress and drip feed indicators to admin task management"
```

---

## Task 8: Update Admin Submissions Page — Phase Context

**Files:**
- Modify: `src/app/(authenticated)/admin/submissions/page.tsx`

### Step 1: Add phase column to flat table

Show phase name when `phase_id` is present, "—" otherwise. Look up phase from the task's phases array.

### Step 2: Update grouped view

When grouping by task, show a sub-grouping indicator for phases. In the group header, show phase progress.

### Step 3: Update detail panel

Add a "Phase" section in `SubmissionDetailPanel` showing:
- Phase name and index
- Phase instructions
- Phase reward (if different from task reward)

### Step 4: Verify, commit

```bash
git add src/app/\\(authenticated\\)/admin/submissions/page.tsx
git commit -m "feat: add phase context to admin submissions review"
```

---

## Task 9: Update Worker Task Page — Phase & Drip Awareness

**Files:**
- Modify: `src/app/(authenticated)/user/page.tsx`

### Step 1: Update TaskCard

Show active phase info on the card:
- "Phase: [phase_name]" if task has phases
- Reward should reflect the active phase's reward for phased tasks
- Slot count should reflect released slots (drip-aware)

### Step 2: Update TaskDetail

For phased tasks:
- Show the active phase prominently (name, instructions, reward, available slots)
- Show a minimal phase stepper if worker has submitted in past phases
- Hide future phases entirely

For drip-fed tasks:
- Show available slots based on released count
- If in "waiting" state, show "More slots available soon" indicator

### Step 3: Update SubmissionForm

- Include `phase_id` in submission data when submitting to a phased task
- Use the active phase's context (instructions, reward) in the form

### Step 4: Fetch submissions for phase visibility

Add `useSubmissionsByUser` query to the worker page so we can compute which past phases the worker can see.

### Step 5: Verify, commit

```bash
git add src/app/\\(authenticated\\)/user/page.tsx
git commit -m "feat: update worker task view with phase and drip feed awareness"
```

---

## Task 10: Bulk Upload in Task Composer

**Files:**
- Create: `src/features/tasks/bulk-upload.tsx`
- Modify: `src/features/tasks/task-composer.tsx` (add tab/mode toggle)
- Modify: `src/features/tasks/hooks.ts` (ensure `useBulkCreateTasks` exists)

### Step 1: Create BulkUpload component

`src/features/tasks/bulk-upload.tsx`:

Features:
- Dialog with two modes: "Single" and "Bulk" as tabs
- Bulk mode has:
  - Large textarea for JSON paste
  - "Parse" button that validates against `TaskFormValuesSchema` array
  - Preview table showing parsed tasks with inline validation errors per row
  - Ability to remove invalid rows
  - "Create All" button that calls `bulkCreateTasks`
- Include a "Template" button that copies a sample JSON array to clipboard
- Show parse errors inline and per-row

### Step 2: Integrate into task composer

Add a tab bar at the top of the TaskComposer dialog: "Single" | "Bulk Import"
- Single: existing form
- Bulk Import: BulkUpload component

### Step 3: Verify, commit

```bash
git add src/features/tasks/bulk-upload.tsx src/features/tasks/task-composer.tsx
git commit -m "feat: add bulk upload flow with JSON paste, preview, and validation"
```

---

## Task 11: Worker Earnings Dashboard

**Files:**
- Create: `src/app/(authenticated)/user/earnings/page.tsx`
- Modify: `src/components/shared/app-shell.tsx` (add nav item)

### Step 1: Add earnings nav item

In `src/components/shared/app-shell.tsx`, add to `userNav`:
```typescript
{ label: "Earnings", href: "/user/earnings", icon: <DollarSign className="size-4" /> },
```

### Step 2: Create earnings page

`src/app/(authenticated)/user/earnings/page.tsx`:

Features:
- Summary cards at top:
  - Total Earnings (approved)
  - Pending Earnings
  - Total Submissions count
- Earnings breakdown list showing each approved/pending submission with:
  - Task title
  - Phase name (if applicable)
  - Status badge
  - Reward amount
  - Date
- Sort by date (newest first)
- Mobile-friendly card layout

Use `useSubmissionsByUser` and `useTasks` to compute earnings via the `getWorkerEarnings` helper.

### Step 3: Add optimistic earning update

In `useCreateSubmission` hook, add `onMutate` handler that:
- Snapshots the current submissions cache
- Adds a temporary optimistic submission with `status: "pending"`
- Returns the snapshot for rollback in `onError`

This makes earnings update immediately after submission.

### Step 4: Verify, commit

```bash
git add src/app/\\(authenticated\\)/user/earnings/page.tsx src/components/shared/app-shell.tsx
git commit -m "feat: add worker earnings dashboard with optimistic updates"
```

---

## Task 12: Worker Past Submissions

**Files:**
- Create: `src/app/(authenticated)/user/submissions/page.tsx`
- Modify: `src/components/shared/app-shell.tsx` (add nav item)

### Step 1: Add submissions nav item

In `src/components/shared/app-shell.tsx`, add to `userNav`:
```typescript
{ label: "Submissions", href: "/user/submissions", icon: <ClipboardCheck className="size-4" /> },
```

### Step 2: Create submissions history page

`src/app/(authenticated)/user/submissions/page.tsx`:

Features:
- Status filter tabs: All / Pending / Approved / Rejected
- Sort: Newest first (default), Oldest first
- Each submission card/row shows:
  - Task title
  - Task type badge
  - Phase name (if applicable)
  - Status badge
  - Reward amount
  - Submitted date
  - Reviewed date (if applicable)
- Mobile-first card layout
- Pagination or infinite scroll
- Empty state: "You haven't submitted any tasks yet"
- Loading skeleton

### Step 3: Verify, commit

```bash
git add src/app/\\(authenticated\\)/user/submissions/page.tsx src/components/shared/app-shell.tsx
git commit -m "feat: add worker past submissions screen with filtering and sorting"
```

---

## Task 13: Polish and Design Consistency

**Files:**
- Various UI files

### Step 1: Review and fix all new surfaces

- Ensure consistent badge colors for phases and drip states
- Ensure all async surfaces have: loading, empty, error, success states
- Ensure mobile responsiveness on all new pages
- Verify worker flows don't show campaign_id
- Verify admin flows show all phases

### Step 2: Final build check

Run: `npx next build`
Expected: Clean build with no errors.

### Step 3: Commit

```bash
git commit -m "style: polish Phase 2 surfaces for design consistency and responsiveness"
```

---

## Implementation Notes

### Product Decisions
- **Phase progress**: Use a horizontal stepper with dots (green=complete, blue=active, gray=upcoming) for admin views. Workers only see active phase with minimal stepper for their own past phases.
- **Drip feed**: Progress bar + state badge. On worker side, show released slots count with "More coming soon" text when waiting.
- **Bulk upload**: JSON paste is the primary mode. Could add CSV later. Preview table is critical.
- **Earnings**: Big number display for total approved earnings. Pending shown separately. Optimistic update makes the number bump immediately on submission.
- **Past submissions**: Card-based layout for mobile, table for desktop. Status-first filtering.

### Keyboard shortcuts
- None needed for Phase 2.

### Performance considerations
- Phase progress calculations should be memoized per-task.
- Drip feed time calculations should not trigger re-renders on every tick — only update when state changes.
- Worker phase visibility uses the same submissions data already fetched.

### Migration strategy
- SEED_VERSION bump to 3 forces re-seed with new schema.
- Existing tasks in localStorage that lack `phases`/`drip_feed` will get defaults from Zod `.default()`.
