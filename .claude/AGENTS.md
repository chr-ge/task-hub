# AGENTS.md

## Mission
Build a frontend-first internal micro-task platform.

The product has two roles:
- **Admin**: creates tasks, manages tasks, reviews submissions
- **Worker**: browses tasks, views task details, and submits evidence

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

### Task composer fields
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

### Scope simplification
Ignore advanced platform concepts from the real system, including:
- reservations
- complex behavioral configuration rules
- advanced payout logic
- multi-admin collaboration

Keep the domain intentionally simple for the take-home.

## Required screens and flows

### Shared foundation
Build these first:
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

Expectations:
- fast, low-friction admin workflow
- good defaults
- helpful validation
- thoughtful post-submit UX
- avoid unnecessary redirects if keeping context is better

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

#### Review
Requirements:
- show all worker submissions
- support thousands of submissions
- allow approve/reject
- allow filtering, sorting, and grouping by task
- include enough task context to review quickly from one screen

### Worker side
#### Tasks Feed
Requirements:
- browse all tasks
- sort by latest
- sort by highest reward
- click/tap to view task details
- submit the task from the same screen/context
- support thousands of tasks
- mobile-first usability
- do **not** show campaign ID on worker side

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

### Admin task management
- dense table on desktop is appropriate
- pair table with inline summaries or a side detail panel
- bulk actions should be quick and safe
- destructive actions should have confirmation

### Admin submissions
- pending-first workflow is a strong default
- status filters should be easy to reach
- group-by-task should be available as a mode/toggle
- show task context next to submission context to reduce cognitive load

### Derived progress
For admin clarity, derive and show:
- total submissions
- approved submissions
- pending submissions
- rejected submissions
- slots left vs `amount`
- progress/completion state

### Task deletion
Soft delete in the mock layer is acceptable if it simplifies safety and state handling.
Deleted tasks should not appear in the worker feed.

## Performance expectations
The app must handle:
- thousands of tasks
- thousands of submissions

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
    admin/
    worker/
  lib/
    mock-server/
    storage/
    utils/
  providers/