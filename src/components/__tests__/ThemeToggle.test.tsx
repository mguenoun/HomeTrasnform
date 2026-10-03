import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useTheme } from "../../context/ThemeContext";
import { ThemeToggle } from "../ThemeToggle";

vi.mock("../../context/ThemeContext", () => ({ useTheme: vi.fn() }));

const mockedUseTheme = vi.mocked(useTheme);

describe("ThemeToggle", () => {
  it("propose de passer en clair quand le thème actuel est sombre", async () => {
    const setTheme = vi.fn();
    mockedUseTheme.mockReturnValue({ theme: "dark", setTheme });

    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Passer en mode clair" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(button);
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("propose de passer en sombre quand le thème actuel est clair", async () => {
    const setTheme = vi.fn();
    mockedUseTheme.mockReturnValue({ theme: "light", setTheme });

    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Passer en mode sombre" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
