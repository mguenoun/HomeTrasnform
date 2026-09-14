import { useEffect, useState } from "react";
import { subscribeToAttachments } from "../services/attachments";
import type { TaskAttachment } from "../types";

export function useAttachments(taskId: string | undefined): {
  attachments: TaskAttachment[];
  loading: boolean;
} {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToAttachments(taskId, (next) => {
      setAttachments(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [taskId]);

  return { attachments, loading };
}
