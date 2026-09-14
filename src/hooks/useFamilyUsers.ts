import { useEffect, useState } from "react";
import { subscribeToUsers } from "../services/users";
import type { FamilyUser } from "../types";

export function useFamilyUsers(): { users: FamilyUser[]; loading: boolean } {
  const [users, setUsers] = useState<FamilyUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToUsers((next) => {
      setUsers(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { users, loading };
}
