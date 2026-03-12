@AGENTS.md

## Coding Guidelines

- Prefer minimal, focused edits over broad rewrites.
- Preserve existing architecture and naming conventions.
- Use strict TypeScript; avoid `any`.
- Default to React Hook Form + Zod for forms.
- Default to TanStack Query for async data flows.
- Add loading, empty, error, and pending states for new async UI.
- Keep worker flows mobile-first and admin flows information-dense.
- When requirements are ambiguous, optimize for lower user friction and fewer clicks.
- Before large refactors, confirm they are necessary by checking whether a local improvement would solve the problem.
