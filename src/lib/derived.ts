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

/** Get total slots for the active phase (or task.amount if no phases). */
function getActivePhaseTotalSlots(task: Task): number {
  if (task.phases.length === 0) return task.amount;
  return task.phases.reduce((sum, p) => sum + p.slots, 0);
}

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
  nextReleaseIn: number;
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

/** Calculate earnings for a worker. */
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
