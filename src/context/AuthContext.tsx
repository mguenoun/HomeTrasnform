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
import { upsertUserProfile } from "../services/users";

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
    // signInWithPopup déclenche des avertissements de sécurité Google ("navigateur
    // non sécurisé") quand l'app tourne en PWA installée (contexte proche d'une
    // WebView) — signInWithRedirect fonctionne à l'identique dans un navigateur
    // classique et évite ce faux positif. getRedirectResult() récupère le résultat
    // au retour de redirection ; onAuthStateChanged ci-dessous capte ensuite l'état
    // connecté, mais lui seul ne remonte pas les erreurs de connexion.
    getRedirectResult(auth).catch((err) => {
      setError(
        `La connexion a échoué (${err instanceof Error ? err.message : "erreur inconnue"}). Réessayez.`,
      );
    });

    return onAuthStateChanged(auth, async (nextUser) => {
      // Accès déjà vérifié sur cet appareil : on affiche l'app tout de suite et on
      // revérifie en arrière-plan (les règles Firestore restent la vraie barrière ;
      // ceci ne fait qu'éviter d'attendre l'aller-retour réseau à chaque ouverture).
      const trusted = nextUser?.email ? wasMember(nextUser.email) : false;
      if (trusted && nextUser) {
        setError(null);
        setUser(nextUser);
        setIsAuthorized(true);
        setLoading(false);
      } else {
        setLoading(true);
      }

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
          doc(db, "familymembers", nextUser.email),
        );
        if (!memberDoc.exists()) {
          rememberMember(nextUser.email, false);
          setError(
            `Le compte ${nextUser.email} n'est pas autorisé à accéder à cette application.`,
          );
          await signOut(auth);
          setUser(null);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        rememberMember(nextUser.email, true);
        setError(null);
        setUser(nextUser);
        setIsAuthorized(true);
        setLoading(false);

        // Non-bloquant : l'accès reste autorisé même si la mise à jour du
        // profil (nom/photo affichés aux autres membres) échoue.
        void upsertUserProfile({
          uid: nextUser.uid,
          displayName: nextUser.displayName ?? nextUser.email,
          email: nextUser.email,
          ...(nextUser.photoURL ? { photoURL: nextUser.photoURL } : {}),
        }).catch(() => {});
      } catch (err) {
        // Hors ligne avec un accès déjà vérifié : on garde la session, sans la fermer.
        if (trusted) return;
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
    } catch (err) {
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

const MEMBER_KEY = "ht-member:";

function wasMember(email: string): boolean {
  try {
    return localStorage.getItem(MEMBER_KEY + email) === "1";
  } catch {
    return false;
  }
}

function rememberMember(email: string, member: boolean) {
  try {
    if (member) localStorage.setItem(MEMBER_KEY + email, "1");
    else localStorage.removeItem(MEMBER_KEY + email);
  } catch {
    // stockage indisponible : on revérifie simplement à chaque ouverture
  }
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}
