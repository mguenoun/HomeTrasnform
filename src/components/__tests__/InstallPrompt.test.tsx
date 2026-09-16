import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstallPrompt } from "../InstallPrompt";

function stubUserAgent(userAgent: string) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
}

function stubStandalone(standalone: boolean) {
  Object.defineProperty(window.navigator, "standalone", {
    value: standalone,
    configurable: true,
  });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);
}

beforeEach(() => {
  localStorage.clear();
  stubStandalone(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window.navigator as { standalone?: boolean }).standalone;
});

describe("InstallPrompt — iOS", () => {
  it("affiche les instructions d'installation manuelle sur iOS", () => {
    stubUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

    render(<InstallPrompt />);

    expect(screen.getByText(/Partager/)).toBeInTheDocument();
    expect(screen.getByText(/Sur l'écran d'accueil/)).toBeInTheDocument();
  });

  it("ne s'affiche pas si l'app est déjà installée", () => {
    stubUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    stubStandalone(true);

    render(<InstallPrompt />);

    expect(screen.queryByText(/Partager/)).not.toBeInTheDocument();
  });

  it("se masque durablement au clic sur la croix", () => {
    stubUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

    const { unmount } = render(<InstallPrompt />);
    fireEvent.click(screen.getByRole("button", { name: "Masquer" }));
    expect(screen.queryByText(/Partager/)).not.toBeInTheDocument();

    unmount();
    render(<InstallPrompt />);
    expect(screen.queryByText(/Partager/)).not.toBeInTheDocument();
  });

  it("ne s'affiche pas sur Android ou desktop", () => {
    stubUserAgent("Mozilla/5.0 (Linux; Android 14)");

    render(<InstallPrompt />);

    expect(screen.queryByText(/Partager/)).not.toBeInTheDocument();
  });
});

describe("InstallPrompt — Android/Chrome (beforeinstallprompt)", () => {
  it("affiche un bouton Installer quand l'événement beforeinstallprompt est capté", async () => {
    stubUserAgent("Mozilla/5.0 (Linux; Android 14)");
    render(<InstallPrompt />);

    const promptEvent = new Event("beforeinstallprompt", { cancelable: true });
    const userChoice = Promise.resolve({ outcome: "accepted" as const });
    Object.assign(promptEvent, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice,
    });

    act(() => {
      window.dispatchEvent(promptEvent);
    });

    const installButton = await screen.findByRole("button", { name: "Installer" });
    fireEvent.click(installButton);

    expect((promptEvent as unknown as { prompt: () => Promise<void> }).prompt).toHaveBeenCalled();
  });
});
