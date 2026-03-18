# AGENTS.md

## Mission
Build a frontend-first internal micro-task platform.

The product has two roles:
- **Admin**: creates tasks, manages tasks, reviews submissions
- **Worker**: browses tasks, views task details, submits evidence, and tracks earnings/history

This is **not** a marketplace between users. Only one admin exists. Workers do not hire each other.

## Canonical project guidance
This file is the primary source of truth for:
- product requirements
- domain rules
- UX expectations
- engineering conventions
- design expectations
- definition of done

Other agent-specific files should reference this file instead of duplicating it.

## Hard constraints
Use:
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Strongly preferred libraries:
- TanStack Query
- TanStack Table
- Zod
- react-hook-form
- nuqs
- lexical

The backend is mocked for this assignment.

Persistence:
- localStorage or IndexedDB

Simulated async behavior:
- reads/fetches: **1–3 seconds**
- writes/mutations: **3–5 seconds**

The app should feel like it talks to a real backend:
- async loading states
- mutation pending states
- realistic success/error handling
- data access abstraction, not direct component-level storage handling

## Product scope

### Task types
Only these three task types exist in this assignment:
- Social Media Posting
- Email Sending
- Social Media Liking

### Base task composer fields
The task composer must support these fields:
- `task_type`
- `title`
- `description`
- `details`
- `amount`
- `reward`
- `allow_multiple_submissions`
- `campaign_id`

### Submission fields by task type
#### Social Media Posting
- Post URL
- Evidence screenshot

#### Email Sending
- Email content
- Evidence screenshot

#### Social Media Liking
- Post URL
- Evidence screenshot

## Phase 2 features

### 1. Task phases
Task phases are an add-on to the existing task model.
They do **not** replace normal task behavior.

A task may either:
- behave like a standard single-stage task, or
- contain multiple sequential phases

Each phase must be completed before the next phase becomes active.
A phase is complete once it has collected enough submissions to fill its slots.

Each phase can have:
- a different display name
- a different phase index/order
- a different number of slots
- different worker instructions
- a different reward
- potentially different submission expectations within the same overall task context

#### Phase fields
Each phase should support:
- `phase_name`
- `phase_index`
- `slots`
- `instructions`
- `reward`

#### Phase behavior
- Only one phase is active at a time
- Workers should only see the **active** phase by default
- Workers may see past phases **only if they have submitted in that phase**
- Admin should see **all phases**
- Admin should be able to edit **all phases**
- Submissions should be viewable:
  - at the task level
  - at the phase level

### 2. Drip feed tasks
Drip feed is configured at the **task level** and inherited by the **currently active phase**.

It controls how many slots are released over time instead of exposing all available slots immediately.

#### Drip feed fields
- `drip_enabled`
- `drip_amount`
- `drip_interval`

Example:
- release 5 slots every 6 hours until the available slots for the active phase have been fully released

#### Drip feed states
- `active`: slots are currently available and the drip is running
- `waiting`: next batch releases in X time
- `completed`: all slots for the current active phase have been released

#### Drip feed behavior
- Workers should only see slots that are currently released/available
- Admin should see drip feed state clearly
- Admin should be able to enable/disable drip feed while editing a task
- Drip feed belongs to the task, not to individual phases
- As the active phase changes, drip logic should apply to that active phase

### 3. Bulk upload
The task composer should support bulk upload to speed up task creation.

This should be designed for admin efficiency.
A practical implementation may support:
- JSON paste/import
- CSV upload
- structured textarea import
- template-based duplication

The UX should make it easy to review and correct parsed tasks before final creation.

### 4. Worker earnings
Workers should have earnings displayed on their dashboard.

Requirements:
- show current earnings summary
- update earnings optimistically when a worker completes a task submission flow
- keep the UI responsive and believable even with mocked async state

Important:
- optimistic earnings should feel immediate
- final status should still reconcile with the mocked backend state

### 5. Worker past submissions
Add a screen showing a worker’s past submissions.

Requirements:
- show past submissions clearly
- support filtering/sorting
- include enough task and phase context
- work well on mobile and desktop

## Scope simplification
Ignore advanced platform concepts from the real system beyond what is explicitly required here, including:
- reservations
- complex behavioral configuration rules outside phases/drip feed
- advanced payout logic
- multi-admin collaboration
- real-time sync across devices/users

Keep the domain intentionally scoped and practical.

## Required screens and flows

### Shared foundation
Build and preserve:
- mock authentication
- mock user profiles
- responsive app shell
- role-aware navigation
- local session persistence

Suggested roles:
- `admin`
- `worker`

Mock auth can be simple, but it should feel intentional and structured.

### Admin side
#### Task Composer
Must support:
- create mode
- edit mode
- phases configuration
- drip feed configuration
- bulk upload flow

Expectations:
- fast, low-friction admin workflow
- good defaults
- helpful validation
- thoughtful post-submit UX
- avoid unnecessary redirects if keeping context is better
- phase editing should be easy to scan and reorder
- bulk upload should reduce repetitive manual entry

#### Tasks Management
Requirements:
- show all tasks
- actions: view, update, delete
- bulk edit selected tasks for at least:
  - amount
  - campaign ID
- filter and sort tasks
- show key details without requiring the admin to click into a row
- show total submissions and slots/amount left
- show task phases in a clear, compact way
- show drip feed state and progress

#### Review
Requirements:
- show all worker submissions
- support thousands of submissions
- allow approve/reject
- allow filtering, sorting, and grouping by task
- support task-level and phase-level review context
- include enough task and phase context to review quickly from one screen

### Worker side
#### Tasks Feed
Requirements:
- browse all visible tasks
- sort by latest
- sort by highest reward
- click/tap to view task details
- submit the task from the same screen/context
- support thousands of tasks
- mobile-first usability
- do **not** show campaign ID on worker side
- only show the active phase by default
- only expose past phases if the worker has submitted in them
- respect drip feed slot availability

#### Worker Dashboard
Requirements:
- show current earnings
- update earnings optimistically
- surface useful summary information without clutter

#### Worker Submission History
Requirements:
- show worker’s past submissions
- include submission status
- include related task info
- include phase info where applicable
- support filtering and sorting
- work well on mobile

## UX rules
I care about product judgment, not just implementation.

Default UX principles:
- minimize clicks
- reduce context switching
- keep related information on one screen when practical
- make admin review fast
- make worker task completion frictionless
- design worker experiences mobile-first
- design admin experiences for dense, fast scanning
- make complex behavior understandable without overwhelming the user

### Expected async states
Every async surface should handle:
- loading
- empty
- error
- success feedback
- pending mutation state

### Ambiguous requirements
When the brief is ambiguous, prefer the decision that:
- reduces drag
- reduces page hops
- improves clarity
- helps a user finish their job faster
- makes advanced behavior easier to understand visually

## Recommended product decisions
Use these defaults unless the codebase or a stronger UX reason suggests otherwise.

### Worker task browsing
- Desktop: task list + detail panel/split view
- Mobile: list + sheet or dedicated detail view optimized for touch
- Submission should happen from the same context as the detail view

### Task organization on worker side
- all task types can live in one feed
- provide filters or tabs if helpful
- sorting should be obvious and quick
- prioritize latest and highest reward because they are explicitly required

### Phases UX
- show the active phase prominently
- show phase progress clearly to admin with compact visual indicators
- use a stepper, segmented timeline, or stacked progress presentation rather than raw text only
- on worker side, do not overload the screen with future phases
- past phases should be visible only when relevant to that worker’s own history

### Drip feed UX
- prefer a progress bar + next release countdown/state over raw numbers alone
- clearly distinguish:
  - total phase slots
  - released slots
  - completed slots
  - remaining unreleased slots
- waiting state should be obvious to the worker if a task is temporarily unavailable due to drip pacing

### Bulk upload UX
- prefer an import flow with preview and validation
- show parse errors inline and per row/item
- make it easy to edit imported tasks before save
- optimize for speed without making the experience fragile

### Admin task management
- dense table on desktop is appropriate
- pair table with inline summaries or a side detail panel
- bulk actions should be quick and safe
- destructive actions should have confirmation
- phase summaries should be visible without forcing full drill-in

### Admin submissions
- pending-first workflow is a strong default
- status filters should be easy to reach
- group-by-task should be available as a mode/toggle
- show task context next to submission context to reduce cognitive load
- phase context should be visible enough to avoid guesswork

### Earnings UX
- worker earnings should feel immediate and rewarding
- optimistic update should happen right after submission action
- final status should still align with the mocked backend data model
- distinguish between lifetime earnings and pending/approved amounts if shown

### Derived progress
For admin clarity, derive and show:
- total submissions
- approved submissions
- pending submissions
- rejected submissions
- slots left vs `amount`
- phase completion state
- active phase
- drip release progress
- drip state
- completion/progress state

### Task deletion
Soft delete in the mock layer is acceptable if it simplifies safety and state handling.
Deleted tasks should not appear in the worker feed.

## Performance expectations
The app must handle:
- thousands of tasks
- thousands of submissions
- derived phase and drip state calculations without UI lag

Use practical performance patterns:
- virtualization where appropriate
- memoized derived data
- efficient filtering/sorting
- async caching/state management through TanStack Query or equivalent
- URL state where it materially improves UX

Do not overengineer, but do not ignore large-list requirements.

## Design system rules
Do not ship stock shadcn/ui styling unchanged.

The assignment explicitly wants evidence of customization and design judgment.

Create a distinct and consistent design system across the app:
- buttons
- inputs
- selects
- textareas
- cards
- tables
- dialogs
- sheets/drawers
- badges
- status indicators
- spacing
- border radius
- typography
- surface colors
- interaction states
- progress visuals
- phase/drip indicators

Inspiration in the brief is directional only.
Do **not** clone it.
Use it as reference for polish and system thinking, not visual duplication.

Recommended design direction:
- clean SaaS admin UI
- compact density on admin screens
- more touch-friendly worker surfaces
- crisp hierarchy
- subtle but deliberate visual identity

## Engineering conventions

### Architecture
Use a feature-based folder structure.

Example direction:
```txt
src/
  app/
  components/
    ui/
    shared/
  features/
    auth/
    tasks/
    submissions/
    phases/
    drip-feed/
    earnings/
    admin/
    worker/
  lib/
    mock-server/
    storage/
    utils/
  providers/