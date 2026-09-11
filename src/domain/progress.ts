import type { Task } from "../types";

export interface ProgressSummary {
  total: number;
  done: number;
  percent: number;
}

export function computeProgress(tasks: Task[]): ProgressSummary {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percent };
}
