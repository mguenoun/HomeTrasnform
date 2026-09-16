import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { AppNav } from "../AppNav";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);

function renderNav(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppNav />
    </MemoryRouter>,
  );
}

describe("AppNav", () => {
  const signOutUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { uid: "user-1", displayName: "Marie Guenoun" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser,
    });
  });

  it("propose un lien vers chaque page, y compris depuis la liste des tâches", () => {
    renderNav("/tasks");

    expect(
      screen.getByRole("link", { name: "Tableau de bord" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Objectifs" })).toHaveAttribute(
      "href",
      "/objectives",
    );
    expect(screen.getByRole("link", { name: "Tâches" })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByRole("link", { name: "Budget" })).toHaveAttribute(
      "href",
      "/budget",
    );
  });

  it("met en évidence la page courante", () => {
    renderNav("/tasks");

    expect(screen.getByRole("link", { name: "Tâches" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Tableau de bord" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("affiche le nom de l'utilisateur et déclenche la déconnexion", async () => {
    renderNav("/");

    expect(screen.getByText("Marie Guenoun")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /se déconnecter/i }),
    );
    expect(signOutUser).toHaveBeenCalledTimes(1);
  });
});
