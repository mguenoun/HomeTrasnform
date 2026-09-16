import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "../Breadcrumb";

describe("Breadcrumb", () => {
  it("rend chaque niveau comme un lien cliquable, sauf le dernier", () => {
    render(
      <MemoryRouter>
        <Breadcrumb
          items={[
            { label: "Tableau de bord", to: "/" },
            { label: "Objectifs", to: "/objectives" },
            { label: "Réaménager le salon" },
          ]}
        />
      </MemoryRouter>,
    );

    const objectifsLink = screen.getByRole("link", { name: "Objectifs" });
    expect(objectifsLink).toHaveAttribute("href", "/objectives");

    const current = screen.getByText("Réaménager le salon");
    expect(current.tagName).not.toBe("A");
    expect(current).toHaveAttribute("aria-current", "page");
  });
});
