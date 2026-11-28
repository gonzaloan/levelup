// Today's mission: three small tasks that make a study day (learn one concept, review what is due,
// do the Gym). Pure, so it is unit-tested; the Hoy screen feeds it the reader's state. The big
// button always goes to the first unfinished, unlocked task (docs/specs/simplify.md).

export type TaskId = "learn" | "review" | "gym";
export type TaskState = "done" | "todo" | "locked";
export interface MissionInput {
  /** A concept was first read today. */
  learnedToday: boolean;
  /** There is something to review: a card, or a concept read (its items come as new cards). */
  canReview: boolean;
  /** Cards due now. */
  due: number;
  /** Cards reviewed today. */
  reviewedToday: number;
  /** A daily review session was finished today. */
  reviewSessionDone: boolean;
  /** Today's Gym workout is finished. */
  gymDone: boolean;
}
export interface Mission { tasks: { id: TaskId; state: TaskState }[]; next: TaskId | null; done: number }

export function missionOf(m: MissionInput): Mission {
  // One finished session is the day's review: after a week away 100 cards can be due, and new cards
  // come back within minutes (short-term steps). A tick that comes undone teaches people to quit.
  const reviewed = m.reviewSessionDone || (m.reviewedToday > 0 && m.due === 0);
  const review: TaskState = !m.canReview ? "locked" : reviewed ? "done" : "todo";
  const tasks: Mission["tasks"] = [
    { id: "learn", state: m.learnedToday ? "done" : "todo" },
    { id: "review", state: review },
    { id: "gym", state: m.gymDone ? "done" : "todo" },
  ];
  return { tasks, next: tasks.find((t) => t.state === "todo")?.id ?? null, done: tasks.filter((t) => t.state === "done").length };
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isToday = (ms: number | string | undefined, now: Date) => ms !== undefined && sameDay(new Date(ms), now);
