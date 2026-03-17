import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(["admin", "user"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const TaskTypeSchema = z.enum([
  "social_media_posting",
  "email_sending",
  "social_media_liking",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const SubmissionStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  avatar_url: z.string().url().nullable(),
});

export type User = z.infer<typeof UserSchema>;

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

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

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
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Task = z.infer<typeof TaskSchema>;

// ---------------------------------------------------------------------------
// TaskFormValues — for creating / editing a task (no server-managed fields)
// ---------------------------------------------------------------------------

export const TaskFormValuesSchema = TaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  drip_last_released_at: true,
  drip_released_count: true,
});

export type TaskFormValues = z.infer<typeof TaskFormValuesSchema>;

// ---------------------------------------------------------------------------
// Submission data — discriminated union by task_type
// ---------------------------------------------------------------------------

export const SocialMediaPostingDataSchema = z.object({
  task_type: z.literal("social_media_posting"),
  post_url: z.string().url(),
  evidence_screenshot_url: z.string().url(),
});

export type SocialMediaPostingData = z.infer<
  typeof SocialMediaPostingDataSchema
>;

export const EmailSendingDataSchema = z.object({
  task_type: z.literal("email_sending"),
  email_content: z.string().min(10, "Must be at least 10 characters"),
  evidence_screenshot_url: z.string().url(),
});

export type EmailSendingData = z.infer<typeof EmailSendingDataSchema>;

export const SocialMediaLikingDataSchema = z.object({
  task_type: z.literal("social_media_liking"),
  post_url: z.string().url(),
  evidence_screenshot_url: z.string().url(),
});

export type SocialMediaLikingData = z.infer<typeof SocialMediaLikingDataSchema>;

export const SubmissionDataSchema = z.discriminatedUnion("task_type", [
  SocialMediaPostingDataSchema,
  EmailSendingDataSchema,
  SocialMediaLikingDataSchema,
]);

export type SubmissionData = z.infer<typeof SubmissionDataSchema>;

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  phase_id: z.string().uuid().nullable().default(null),
  user_id: z.string().uuid(),
  status: SubmissionStatusSchema,
  data: SubmissionDataSchema,
  submitted_at: z.string().datetime(),
  reviewed_at: z.string().datetime().nullable(),
});

export type Submission = z.infer<typeof SubmissionSchema>;

// ---------------------------------------------------------------------------
// SubmissionFormValues — what a user fills in (no server-managed fields)
// ---------------------------------------------------------------------------

export const SubmissionFormValuesSchema = SubmissionSchema.omit({
  id: true,
  user_id: true,
  status: true,
  submitted_at: true,
  reviewed_at: true,
});

export type SubmissionFormValues = z.infer<typeof SubmissionFormValuesSchema>;
