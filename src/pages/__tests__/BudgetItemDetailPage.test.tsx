import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { useBudgetItems } from "../../hooks/useBudgetItems";
import { useFamilyUsers } from "../../hooks/useFamilyUsers";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import type { BudgetItem, Objective, Task } from "../../types";
import { BudgetItemDetailPage } from "../BudgetItemDetailPage";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../hooks/useBudgetItems", () => ({ useBudgetItems: vi.fn() }));
vi.mock("../../hooks/useFamilyUsers", () => ({ useFamilyUsers: vi.fn() }));
vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));
vi.mock("../../hooks/useTasks", () => ({ useTasks: vi.fn() }));
vi.mock("../../services/budgetItems", () => ({
  updateBudgetItem: vi.fn().mockResolvedValue(undefined),
  deleteBudgetItem: vi.fn().mockResolvedValue(undefined),
  createPaymentId: vi.fn(() => "payment-id"),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseBudgetItems = vi.mocked(useBudgetItems);
const mockedUseFamilyUsers = vi.mocked(useFamilyUsers);
const mockedUseObjectives = vi.mocked(useObjectives);
const mockedUseTasks = vi.mocked(useTasks);

const ITEM: BudgetItem = {
  id: "item1",
  title: "Peinture salon",
  category: "materiaux",
  objectiveId: null,
  taskId: null,
  budgeted: 1000,
  forecastHistory: [],
  payments: [],
  createdBy: "u1",
  createdAt: 0,
  updatedAt: 0,
};

const OBJECTIVE: Objective = {
  id: "obj1",
  title: "Rénover le salon",
  status: "active",
  createdBy: "u1",
  createdAt: 0,
};

const TASK: Task = {
  id: "task1",
  objectiveId: "obj1",
  title: "Repeindre les murs",
  type: "travaux",
  priority: "medium",
  status: "todo",
  assigneeIds: [],
  createdBy: "u1",
  createdAt: 0,
  updatedAt: 0,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/budget/item1"]}>
      <Routes>
        <Route path="/budget/:id" element={<BudgetItemDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BudgetItemDetailPage — fil d'ariane", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: { uid: "u1" } as never,
      loading: false,
      isAuthorized: true,
      error: null,
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
    });
    mockedUseFamilyUsers.mockReturnValue({ users: [], loading: false });
  });

  it("remonte jusqu'à l'objectif quand la rubrique y est rattachée directement", () => {
    mockedUseBudgetItems.mockReturnValue({
      items: [{ ...ITEM, objectiveId: "obj1" }],
      loading: false,
    });
    mockedUseObjectives.mockReturnValue({
      objectives: [OBJECTIVE],
      loading: false,
    });
    mockedUseTasks.mockReturnValue({ tasks: [], loading: false });

    renderPage();

    const link = screen.getByRole("link", { name: "Rénover le salon" });
    expect(link).toHaveAttribute("href", "/objectives/obj1");
  });

  it("remonte jusqu'à la tâche quand la rubrique est rattachée à une tâche", () => {
    mockedUseBudgetItems.mockReturnValue({
      items: [{ ...ITEM, objectiveId: "obj1", taskId: "task1" }],
      loading: false,
    });
    mockedUseObjectives.mockReturnValue({
      objectives: [OBJECTIVE],
      loading: false,
    });
    mockedUseTasks.mockReturnValue({ tasks: [TASK], loading: false });

    renderPage();

    const link = screen.getByRole("link", { name: "Repeindre les murs" });
    expect(link).toHaveAttribute("href", "/tasks/task1");
    expect(
      screen.queryByRole("link", { name: "Rénover le salon" }),
    ).not.toBeInTheDocument();
  });

  it("retombe sur Budget quand la rubrique n'est rattachée à rien", () => {
    mockedUseBudgetItems.mockReturnValue({ items: [ITEM], loading: false });
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseTasks.mockReturnValue({ tasks: [], loading: false });

    renderPage();

    const link = screen.getByRole("link", { name: "Budget" });
    expect(link).toHaveAttribute("href", "/budget");
  });
});
