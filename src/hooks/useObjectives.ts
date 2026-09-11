import { useEffect, useState } from "react";
import { subscribeToObjectives } from "../services/objectives";
import type { Objective } from "../types";

export function useObjectives(): {
  objectives: Objective[];
  loading: boolean;
} {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToObjectives((next) => {
      setObjectives(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { objectives, loading };
}
