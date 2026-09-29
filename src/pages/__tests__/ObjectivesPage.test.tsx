import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { useBudgetItems } from "../../hooks/useBudgetItems";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import type { Objective } from "../../types";
import { ObjectivesPage } from "../ObjectivesPage";

vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));
vi.mock("../../hooks/useTasks", () => ({ useTasks: vi.fn() }));
vi.mock("../../hooks/useBudgetItems", () => ({ useBudgetItems: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));

const mockedUseObjectives = vi.mocked(useObjectives);
const mockedUseTasks = vi.mocked(useTasks);
const mockedUseBudgetItems = vi.mocked(useBudgetItems);
const mockedUseAuth = vi.mocked(useAuth);

function objective(overrides: Partial<Objective>): Objective {
  return {
    id: "obj",
    title: "Objectif",
    status: "active",
    createdBy: "u1",
    createdAt: 0,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ObjectivesPage />
    </MemoryRouter>,
  );
}

describe("ObjectivesPage", () => {
  beforeEach(() => {
    mockedUseTasks.mockReturnValue({ tasks: [], loading: false });
    mockedUseBudgetItems.mockReturnValue({ items: [], loading: false });
    mockedUseAuth.mockReturnValue({
      user: { uid: "u1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
  });

  it("sépare les objectifs partagés et privés dans deux blocs, le bloc privé seulement s'il y a des objectifs privés", () => {
    mockedUseObjectives.mockReturnValue({
      objectives: [
        objective({ id: "shared1", title: "Rénover le salon" }),
        objective({ id: "priv1", title: "Surprise anniversaire", visibility: "private" }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Objectifs partagés")).toBeInTheDocument();
    expect(screen.getByText("Objectifs privés")).toBeInTheDocument();

    const sharedSection = screen
      .getByText("Objectifs partagés")
      .closest("section") as HTMLElement;
    expect(within(sharedSection).getByText("Rénover le salon")).toBeInTheDocument();
    expect(
      within(sharedSection).queryByText("Surprise anniversaire"),
    ).not.toBeInTheDocument();

    const privateSection = screen
      .getByText("Objectifs privés")
      .closest("section") as HTMLElement;
    expect(
      within(privateSection).getByText("Surprise anniversaire"),
    ).toBeInTheDocument();
  });

  it("n'affiche pas le bloc privé quand il n'y a aucun objectif privé", () => {
    mockedUseObjectives.mockReturnValue({
      objectives: [objective({ id: "shared1", title: "Rénover le salon" })],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Objectifs partagés")).toBeInTheDocument();
    expect(screen.queryByText("Objectifs privés")).not.toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucun objectif partagé", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });

    renderPage();

    expect(
      screen.getByText("Aucun objectif partagé pour le moment."),
    ).toBeInTheDocument();
  });
});
