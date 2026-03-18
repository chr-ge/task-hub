import type { TaskType, SubmissionStatus } from "./types";

// ---------------------------------------------------------------------------
// Task type labels
// ---------------------------------------------------------------------------

/** Full labels for task types (used in forms, headers, detail views) */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  social_media_posting: "Social Media Posting",
  email_sending: "Email Sending",
  social_media_liking: "Social Media Liking",
};

/** Short labels for compact display (tables, badges, lists) */
export const TASK_TYPE_SHORT_LABELS: Record<TaskType, string> = {
  social_media_posting: "Posting",
  email_sending: "Email",
  social_media_liking: "Liking",
};

// ---------------------------------------------------------------------------
// Task type badge Tailwind classes (dark mode aware)
// ---------------------------------------------------------------------------

export const TASK_TYPE_BADGE_CLASSES: Record<TaskType, string> = {
  social_media_posting:
    "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  email_sending:
    "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  social_media_liking:
    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

// ---------------------------------------------------------------------------
// Submission status colors (Tailwind classes, dark mode aware)
// ---------------------------------------------------------------------------

export const STATUS_BADGE_CLASSES: Record<SubmissionStatus, string> = {
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  rejected:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};
