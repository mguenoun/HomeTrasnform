import { useEffect, useState } from "react";
import { subscribeToComments } from "../services/comments";
import type { TaskComment } from "../types";

export function useComments(taskId: string | undefined): {
  comments: TaskComment[];
  loading: boolean;
} {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToComments(taskId, (next) => {
      setComments(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [taskId]);

  return { comments, loading };
}
