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
  /** At least one card was reviewed today. */
  reviewedToday: boolean;
  /** Today's Gym workout is finished. */
  gymDone: boolean;
}
export interface Mission { tasks: { id: TaskId; state: TaskState }[]; next: TaskId | null; done: number }

export function missionOf(m: MissionInput): Mission {
  const review: TaskState = !m.hasCards ? "locked" : m.due === 0 && m.reviewedToday ? "done" : "todo";
  const tasks: Mission["tasks"] = [
    { id: "learn", state: m.learnedToday ? "done" : "todo" },
    { id: "review", state: review },
    { id: "gym", state: m.gymDone ? "done" : "todo" },
  ];
  return { tasks, next: tasks.find((t) => t.state === "todo")?.id ?? null, done: tasks.filter((t) => t.state === "done").length };
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isToday = (ms: number | string | undefined, now: Date) => ms !== undefined && sameDay(new Date(ms), now);
