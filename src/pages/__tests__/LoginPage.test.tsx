import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { LoginPage } from "../LoginPage";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

describe("LoginPage", () => {
  it("affiche le bouton de connexion Google et déclenche la connexion au clic", async () => {
    const signInWithGoogle = vi.fn();
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthorized: false,
      error: null,
      signInWithGoogle,
      signOutUser: vi.fn(),
    });

    render(<LoginPage />);

    const button = screen.getByRole("button", {
      name: /se connecter avec google/i,
    });
    await userEvent.click(button);

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it("affiche le message d'erreur quand le compte n'est pas autorisé", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthorized: false,
      error: "Ce compte n'est pas autorisé.",
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });

    render(<LoginPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ce compte n'est pas autorisé.",
    );
  });
});
