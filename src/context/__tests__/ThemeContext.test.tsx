import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../AuthContext";
import { ThemeProvider, useTheme } from "../ThemeContext";
import { useFamilyUsers } from "../../hooks/useFamilyUsers";
import { setUserThemePreference } from "../../services/users";

vi.mock("../AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../hooks/useFamilyUsers", () => ({ useFamilyUsers: vi.fn() }));
vi.mock("../../services/users", () => ({
  setUserThemePreference: vi.fn().mockResolvedValue(undefined),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseFamilyUsers = vi.mocked(useFamilyUsers);
const mockedSetUserThemePreference = vi.mocked(setUserThemePreference);

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <p>theme: {theme}</p>
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        basculer
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthorized: false,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
    mockedUseFamilyUsers.mockReturnValue({ users: [], loading: false });
  });

  it("démarre en mode sombre par défaut quand rien n'est mémorisé", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByText("theme: dark")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("reprend la préférence mémorisée localement au prochain chargement", () => {
    localStorage.setItem("ht-theme", "light");

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByText("theme: light")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("la préférence du profil Firestore prévaut sur le cache local dès qu'elle est connue", () => {
    localStorage.setItem("ht-theme", "dark");
    mockedUseAuth.mockReturnValue({
      user: { uid: "user-1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
    mockedUseFamilyUsers.mockReturnValue({
      users: [
        {
          uid: "user-1",
          displayName: "Marie",
          email: "marie@example.com",
          themePreference: "light",
        },
      ],
      loading: false,
    });

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByText("theme: light")).toBeInTheDocument();
  });

  it("bascule le thème, met à jour le DOM et le cache local", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "basculer" }));

    expect(screen.getByText("theme: light")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("ht-theme")).toBe("light");
  });

  it("écrit la préférence sur le profil Firestore quand un utilisateur est connecté", async () => {
    mockedUseAuth.mockReturnValue({
      user: { uid: "user-1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "basculer" }));

    await waitFor(() => {
      expect(mockedSetUserThemePreference).toHaveBeenCalledWith(
        "user-1",
        "light",
      );
    });
  });

  it("ne tente pas d'écrire sur un profil Firestore sans utilisateur connecté", async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "basculer" }));

    expect(mockedSetUserThemePreference).not.toHaveBeenCalled();
  });
});
