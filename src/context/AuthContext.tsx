import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  const redirectResultRequested = useRef(false);

  useEffect(() => {
    // React StrictMode invoque les effets deux fois en développement ; le résultat
    // de redirection Firebase n'est consultable qu'une fois, donc un second appel
    // immédiat renverrait null même si le premier a bien recupéré la connexion.
    if (redirectResultRequested.current) {
      return;
    }
    redirectResultRequested.current = true;

    getRedirectResult(auth)
      .then((result) => {
        console.log("[HomeTransform:auth] getRedirectResult ->", result);
      })
      .catch((err) => {
        console.log("[HomeTransform:auth] getRedirectResult error ->", err);
        setError(
          `La connexion a échoué (${err instanceof Error ? err.message : "erreur inconnue"}).`,
        );
      });
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      console.log("[HomeTransform:auth] onAuthStateChanged ->", nextUser);
      setLoading(true);

      if (!nextUser || !nextUser.email) {
        // Ne pas effacer une erreur existante ici : ce cas se produit aussi
        // juste après notre propre signOut() ci-dessous (accès refusé), et on
        // veut que le message reste visible plutôt que d'être écrasé par ce
        // second événement onAuthStateChanged qu'il déclenche lui-même.
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
          console.log(
            "[HomeTransform:auth] pas de document familyMembers pour",
            nextUser.email,
          );
          setError(
            `Le compte ${nextUser.email} n'est pas autorisé à accéder à cette application.`,
          );
          await signOut(auth);
          setUser(null);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setError(null);
        setUser(nextUser);
        setIsAuthorized(true);
        setLoading(false);
      } catch (err) {
        console.log("[HomeTransform:auth] erreur getDoc familyMembers ->", err);
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
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.log("[HomeTransform:auth] signInWithPopup error ->", err);
      setError(
        `La connexion a échoué (${err instanceof Error ? err.message : "erreur inconnue"}). Réessayez.`,
      );
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
