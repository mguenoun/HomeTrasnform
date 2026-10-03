import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useFamilyUsers } from "../hooks/useFamilyUsers";
import { setUserThemePreference } from "../services/users";
import type { ThemePreference } from "../types";

const STORAGE_KEY = "ht-theme";

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readCachedTheme(): ThemePreference | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    return cached === "light" || cached === "dark" ? cached : null;
  } catch {
    // Stockage indisponible (navigation privée, données de site bloquées...) :
    // on retombe simplement sur le défaut, pas une erreur bloquante.
    return null;
  }
}

function applyThemeClass(theme: ThemePreference) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Sert uniquement à retrouver MON profil (déjà chargé pour d'autres usages
  // de l'app) ; pas d'abonnement supplémentaire pour ça.
  const { users } = useFamilyUsers();
  const myThemePreference = users.find((u) => u.uid === user?.uid)
    ?.themePreference;

  const [theme, setThemeState] = useState<ThemePreference>(
    () => readCachedTheme() ?? "dark",
  );

  // index.html applique déjà la bonne classe de façon synchrone avant le
  // premier rendu (voir le script inline), mais on la réapplique ici pour
  // rester cohérent avec le state React à chaque changement.
  useEffect(() => {
    applyThemeClass(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Pas grave : juste un cache pour éviter un flash au prochain
      // chargement, le profil Firestore reste la source de vérité.
    }
  }, [theme]);

  // Le profil Firestore (synchronisé entre appareils) est prioritaire sur le
  // cache local dès qu'il est disponible et diffère.
  useEffect(() => {
    if (myThemePreference && myThemePreference !== theme) {
      setThemeState(myThemePreference);
    }
  }, [myThemePreference]);

  function setTheme(next: ThemePreference) {
    setThemeState(next);
    if (user) {
      void setUserThemePreference(user.uid, next).catch(() => {});
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme doit être utilisé dans un ThemeProvider");
  }
  return context;
}
