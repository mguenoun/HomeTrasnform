import { useEffect, useState } from "react";
import { subscribeToTasks } from "../services/tasks";
import type { Task } from "../types";

export function useTasks(): { tasks: Task[]; loading: boolean } {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToTasks((next) => {
      setTasks(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { tasks, loading };
}
