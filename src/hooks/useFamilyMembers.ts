import { useEffect, useState } from "react";
import { subscribeToFamilyMembers } from "../services/users";
import type { FamilyMemberRecord } from "../types";

export function useFamilyMembers(): {
  members: FamilyMemberRecord[];
  loading: boolean;
} {
  const [members, setMembers] = useState<FamilyMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToFamilyMembers((next) => {
      setMembers(next);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { members, loading };
}
