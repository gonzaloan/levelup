// Today's mission: three small tasks that make a study day (learn one concept, review what is due,
// do the Gym). Pure, so it is unit-tested; the Hoy screen feeds it the reader's state. The big
// button always goes to the first unfinished, unlocked task (docs/specs/simplify.md).

export type TaskId = "learn" | "review" | "gym";
export type TaskState = "done" | "todo" | "locked";
export interface MissionInput {
  /** A concept was first read today. */
  learnedToday: boolean;
  /** The reader has at least one review card (else there is nothing to review yet). */
  hasCards: boolean;
  /** Cards due now. */
  due: number;
  /** Cards reviewed today. */
  reviewedToday: number;
  /** Today's Gym workout is finished. */
  gymDone: boolean;
}
export interface Mission { tasks: { id: TaskId; state: TaskState }[]; next: TaskId | null; done: number }

/** One review session's worth: after a week away 100 cards can be due, and a day that needs seven
 *  sessions to count teaches people to quit. The rest stays due for tomorrow. */
export const REVIEW_SESSION = 15;

export function missionOf(m: MissionInput): Mission {
  const reviewed = m.reviewedToday > 0 && (m.due === 0 || m.reviewedToday >= REVIEW_SESSION);
  const review: TaskState = !m.hasCards ? "locked" : reviewed ? "done" : "todo";
  const tasks: Mission["tasks"] = [
    { id: "learn", state: m.learnedToday ? "done" : "todo" },
    { id: "review", state: review },
    { id: "gym", state: m.gymDone ? "done" : "todo" },
  ];
  return { tasks, next: tasks.find((t) => t.state === "todo")?.id ?? null, done: tasks.filter((t) => t.state === "done").length };
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isToday = (ms: number | string | undefined, now: Date) => ms !== undefined && sameDay(new Date(ms), now);
