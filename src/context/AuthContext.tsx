import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth, db } from "../firebase/config";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      setError(
        `La connexion a échoué (${err instanceof Error ? err.message : "erreur inconnue"}).`,
      );
    });
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setLoading(true);
      setError(null);

      if (!nextUser || !nextUser.email) {
        setUser(null);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        const memberDoc = await getDoc(
          doc(db, "familyMembers", nextUser.email),
        );
        if (!memberDoc.exists()) {
          setError(
            `Le compte ${nextUser.email} n'est pas autorisé à accéder à cette application.`,
          );
          await signOut(auth);
          setUser(null);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setUser(nextUser);
        setIsAuthorized(true);
        setLoading(false);
      } catch (err) {
        setError(
          `Impossible de vérifier votre accès (${err instanceof Error ? err.message : "erreur inconnue"}). Vérifiez les règles de sécurité Firestore.`,
        );
        await signOut(auth);
        setUser(null);
        setIsAuthorized(false);
        setLoading(false);
      }
    });
  }, []);

  async function signInWithGoogle() {
    setError(null);
    try {
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } catch {
      setError("La connexion a échoué. Veuillez réessayer.");
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthorized, error, signInWithGoogle, signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}
