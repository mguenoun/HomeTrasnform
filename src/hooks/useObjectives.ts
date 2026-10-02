import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeToObjectives } from "../services/objectives";
import type { Objective } from "../types";

export function useObjectives(): {
  objectives: Objective[];
  loading: boolean;
} {
  const { user } = useAuth();
  const uid = user?.uid;
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      // Déconnecté (ou changement de compte en cours) : repartir de zéro
      // plutôt que de garder en mémoire les données de la session précédente
      // — l'app reste montée entre deux connexions successives sur le même
      // appareil (voir ProtectedRoute), donc sans ce reset, les données d'un
      // premier utilisateur pourraient rester affichées après sa déconnexion.
      setObjectives([]);
      setLoading(true);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToObjectives(uid, (next) => {
      setObjectives(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { objectives, loading };
}
