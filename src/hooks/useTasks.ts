import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeToTasks } from "../services/tasks";
import type { Task } from "../types";

export function useTasks(): { tasks: Task[]; loading: boolean } {
  const { user } = useAuth();
  const uid = user?.uid;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setTasks([]);
      setLoading(true);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToTasks(uid, (next) => {
      setTasks(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { tasks, loading };
}
