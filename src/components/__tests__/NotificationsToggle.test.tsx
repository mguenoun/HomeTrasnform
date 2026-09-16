import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import {
  isPushSubscribed,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../services/push";
import { NotificationsToggle } from "../NotificationsToggle";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../services/push", () => ({
  isPushSupported: vi.fn(),
  isPushSubscribed: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedIsPushSupported = vi.mocked(isPushSupported);
const mockedIsPushSubscribed = vi.mocked(isPushSubscribed);
const mockedSubscribeToPush = vi.mocked(subscribeToPush);
const mockedUnsubscribeFromPush = vi.mocked(unsubscribeFromPush);

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: { uid: "user-1" } as never,
    loading: false,
    isAuthorized: true,
    error: null,
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NotificationsToggle", () => {
  it("ne s'affiche pas quand les notifications push ne sont pas supportées", () => {
    mockedIsPushSupported.mockReturnValue(false);

    render(<NotificationsToggle />);

    expect(
      screen.queryByRole("button", { name: /notifications/i }),
    ).not.toBeInTheDocument();
  });

  it("propose d'activer les notifications quand aucun abonnement n'existe", async () => {
    mockedIsPushSupported.mockReturnValue(true);
    mockedIsPushSubscribed.mockResolvedValue(false);

    render(<NotificationsToggle />);

    expect(
      await screen.findByRole("button", { name: "Activer les notifications" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("active les notifications au clic", async () => {
    mockedIsPushSupported.mockReturnValue(true);
    mockedIsPushSubscribed.mockResolvedValue(false);
    mockedSubscribeToPush.mockResolvedValue(undefined);

    render(<NotificationsToggle />);

    const button = await screen.findByRole("button", {
      name: "Activer les notifications",
    });
    await userEvent.click(button);

    expect(mockedSubscribeToPush).toHaveBeenCalledWith({ uid: "user-1" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Désactiver les notifications" }),
      ).toBeInTheDocument(),
    );
  });

  it("désactive les notifications quand déjà abonné", async () => {
    mockedIsPushSupported.mockReturnValue(true);
    mockedIsPushSubscribed.mockResolvedValue(true);
    mockedUnsubscribeFromPush.mockResolvedValue(undefined);

    render(<NotificationsToggle />);

    const button = await screen.findByRole("button", {
      name: "Désactiver les notifications",
    });
    await userEvent.click(button);

    expect(mockedUnsubscribeFromPush).toHaveBeenCalledWith({ uid: "user-1" });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Activer les notifications" }),
      ).toBeInTheDocument(),
    );
  });

  it("affiche un message d'erreur si l'abonnement échoue", async () => {
    mockedIsPushSupported.mockReturnValue(true);
    mockedIsPushSubscribed.mockResolvedValue(false);
    mockedSubscribeToPush.mockRejectedValue(
      new Error("Autorisation refusée pour les notifications."),
    );

    render(<NotificationsToggle />);

    const button = await screen.findByRole("button", {
      name: "Activer les notifications",
    });
    await userEvent.click(button);

    expect(
      await screen.findByText("Autorisation refusée pour les notifications."),
    ).toBeInTheDocument();
  });
});
