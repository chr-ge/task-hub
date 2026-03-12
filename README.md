# TaskHub

A frontend-first internal micro-task platform for managing, completing, and reviewing work. Built as a take-home assignment demonstrating product judgment, design system thinking, and engineering quality.

## Overview

TaskHub has two roles:

- **Admin** — creates tasks, manages them in bulk, and reviews worker submissions
- **Worker** — browses available tasks, views details, and submits evidence

The backend is fully mocked with localStorage persistence and simulated async delays (1–3s reads, 3–5s writes) to replicate a real API experience.

### Task Types

- Social Media Posting
- Email Sending
- Social Media Liking

## Design Decisions

- **Warm neutral color system** — oklch-based tokens tinted toward hue 75 (warm stone/amber). No pure grayscale remains.
- **Google Sans typography** — clean, modern typeface via `next/font`
- **Card-on-surface depth** — separated `--background` from `--card` and `--sidebar` for layered visual hierarchy
- **Custom task type badges** — color-coded pills (#E0E0E2, #B5BAD0, #7389AE) for instant type recognition
- **Admin-dense, worker-friendly** — admin screens are information-dense with tables and inline actions; worker screens are mobile-first with touch-friendly cards
- **Split-view task browsing** — desktop shows list + detail panel side-by-side; mobile uses a bottom sheet
- **Infinite scroll** — worker task feed loads progressively with an IntersectionObserver sentinel
- **Contextual actions** — actions column hides on approved/rejected submission tabs where it's not needed
- **Entrance animations** — subtle `fade-in-up` staggered animations on cards and list items

## Tech Stack

| Category | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui (customized) |
| Data Fetching | TanStack Query |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |
| URL State | nuqs |
| Icons | Lucide React |
| Notifications | Sonner |
| Persistence | localStorage |

## Project Structure

```
src/
├── app/                    # Next.js routes
│   └── (authenticated)/
│       ├── admin/          # Task management & submission review
│       └── user/           # Worker task feed & submissions
├── components/
│   ├── shared/             # App shell, layout components
│   └── ui/                 # Customized shadcn/ui primitives
├── features/
│   ├── auth/               # Mock auth context & login screen
│   ├── submissions/        # Submission hooks & data layer
│   └── tasks/              # Task hooks, composer, data layer
├── lib/
│   └── repositories/       # Mock data repositories (localStorage)
└── providers/              # App-wide context providers
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On first load, mock users are seeded automatically. Select an account from the login screen to get started.

### Build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```
