import { useEffect, useState } from "react";
import {
  subscribeToAttachments,
  subscribeToBudgetItemAttachments,
  subscribeToObjectiveAttachments,
} from "../services/attachments";
import type { BudgetItemAttachment, ObjectiveAttachment, TaskAttachment } from "../types";

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

export function useObjectiveAttachments(objectiveId: string | undefined): {
  attachments: ObjectiveAttachment[];
  loading: boolean;
} {
  const [attachments, setAttachments] = useState<ObjectiveAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!objectiveId) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToObjectiveAttachments(objectiveId, (next) => {
      setAttachments(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [objectiveId]);

  return { attachments, loading };
}

export function useBudgetItemAttachments(budgetItemId: string | undefined): {
  attachments: BudgetItemAttachment[];
  loading: boolean;
} {
  const [attachments, setAttachments] = useState<BudgetItemAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!budgetItemId) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToBudgetItemAttachments(budgetItemId, (next) => {
      setAttachments(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [budgetItemId]);

  return { attachments, loading };
}
