import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";
import { useFamilyUsers } from "../../hooks/useFamilyUsers";
import { useObjectives } from "../../hooks/useObjectives";
import { useTasks } from "../../hooks/useTasks";
import type { Objective, Task } from "../../types";
import { DashboardPage } from "../DashboardPage";

vi.mock("../../hooks/useObjectives", () => ({ useObjectives: vi.fn() }));
vi.mock("../../hooks/useTasks", () => ({ useTasks: vi.fn() }));
vi.mock("../../hooks/useFamilyUsers", () => ({ useFamilyUsers: vi.fn() }));
vi.mock("../../hooks/useFamilyMembers", () => ({ useFamilyMembers: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));

const mockedUseObjectives = vi.mocked(useObjectives);
const mockedUseTasks = vi.mocked(useTasks);
const mockedUseFamilyUsers = vi.mocked(useFamilyUsers);
const mockedUseFamilyMembers = vi.mocked(useFamilyMembers);
const mockedUseAuth = vi.mocked(useAuth);

function mockAuth(uid: string | null) {
  mockedUseAuth.mockReturnValue({
    user: uid ? ({ uid } as never) : null,
    loading: false,
    isAuthorized: true,
    error: null,
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  });
}

const OBJECTIVE: Objective = {
  id: "obj1",
  title: "Réaménager le salon",
  status: "active",
  createdBy: "u1",
  createdAt: 0,
};

function task(overrides: Partial<Task>): Task {
  return {
    id: "t",
    objectiveId: null,
    title: "Tâche",
    type: "menage",
    priority: "medium",
    status: "todo",
    assigneeIds: [],
    createdBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  it("affiche les objectifs actifs avec leur avancement", () => {
    mockedUseObjectives.mockReturnValue({
      objectives: [OBJECTIVE],
      loading: false,
    });
    mockedUseTasks.mockReturnValue({ tasks: [], loading: false });
    mockedUseFamilyUsers.mockReturnValue({ users: [], loading: false });
    mockedUseFamilyMembers.mockReturnValue({ members: [], loading: false });
    mockAuth(null);

    renderPage();

    expect(screen.getByText("Réaménager le salon")).toBeInTheDocument();
  });

  it("affiche les tâches à échéance proche et les tâches bloquées", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseFamilyUsers.mockReturnValue({ users: [], loading: false });
    mockedUseFamilyMembers.mockReturnValue({ members: [], loading: false });
    mockAuth(null);
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const soonDate = soon.toISOString().slice(0, 10);

    mockedUseTasks.mockReturnValue({
      tasks: [
        task({ id: "upcoming", title: "Payer l'acompte", dueDate: soonDate }),
        task({ id: "blocked", title: "Attendre le plombier", status: "blocked" }),
        task({ id: "done", title: "Déjà fait", status: "done", dueDate: soonDate }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Payer l'acompte")).toBeInTheDocument();
    expect(screen.getByText("Attendre le plombier")).toBeInTheDocument();
    expect(screen.queryByText("Déjà fait")).not.toBeInTheDocument();
  });

  it("affiche des messages vides quand il n'y a rien à montrer", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseTasks.mockReturnValue({ tasks: [], loading: false });
    mockedUseFamilyUsers.mockReturnValue({ users: [], loading: false });
    mockedUseFamilyMembers.mockReturnValue({ members: [], loading: false });
    mockAuth(null);

    renderPage();

    expect(screen.getByText("Aucun objectif pour le moment.")).toBeInTheDocument();
    expect(
      screen.getByText("Aucune tâche à échéance proche."),
    ).toBeInTheDocument();
    expect(screen.getByText("Aucune tâche bloquée.")).toBeInTheDocument();
  });

  it("affiche les KPI globaux et par personne, y compris un assigné sans profil connu", () => {
    mockedUseObjectives.mockReturnValue({
      objectives: [OBJECTIVE, { ...OBJECTIVE, id: "obj2", status: "archived" }],
      loading: false,
    });
    mockedUseTasks.mockReturnValue({
      tasks: [
        task({ id: "t1", assigneeIds: ["u1"], status: "done" }),
        task({ id: "t2", assigneeIds: ["ghost"], status: "todo" }),
        task({ id: "t3", assigneeIds: [], status: "todo" }),
      ],
      loading: false,
    });
    mockedUseFamilyUsers.mockReturnValue({
      users: [{ uid: "u1", displayName: "Alice", email: "alice@example.com" }],
      loading: false,
    });
    mockedUseFamilyMembers.mockReturnValue({
      members: [
        { email: "alice@example.com" },
        { email: "hajar@example.com" },
      ],
      loading: false,
    });
    mockAuth(null);

    renderPage();

    expect(screen.getByText("Objectifs clôturés")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 (50%)")).toBeInTheDocument();
    expect(screen.getByText("Tâches clôturées")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 (33%)")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Utilisateur inconnu")).toBeInTheDocument();
    expect(screen.getByText("hajar@example.com")).toBeInTheDocument();
  });

  it("met en avant la carte de la personne connectée et lui montre ses tâches à échéance proche", () => {
    mockedUseObjectives.mockReturnValue({ objectives: [], loading: false });
    mockedUseFamilyUsers.mockReturnValue({
      users: [
        { uid: "a1", displayName: "Alice", email: "alice@example.com" },
        { uid: "b1", displayName: "Bob", email: "bob@example.com" },
      ],
      loading: false,
    });
    mockedUseFamilyMembers.mockReturnValue({ members: [], loading: false });
    mockAuth("b1");

    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const soonDate = soon.toISOString().slice(0, 10);

    mockedUseTasks.mockReturnValue({
      tasks: [
        task({
          id: "mine",
          title: "Ma tâche",
          assigneeIds: ["b1"],
          dueDate: soonDate,
        }),
        task({
          id: "other",
          title: "Tâche d'Alice",
          assigneeIds: ["a1"],
          dueDate: soonDate,
        }),
      ],
      loading: false,
    });

    renderPage();

    // Bob (utilisateur connecté) apparaît avant Alice dans la grille des KPI,
    // alors que l'ordre alphabétique le placerait après.
    expect(
      screen
        .getByText("Bob")
        .compareDocumentPosition(screen.getByText("Alice")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Bob").closest("div")).toHaveClass(
      "border-blue-300",
    );
    expect(screen.getByText("Alice").closest("div")).not.toHaveClass(
      "border-blue-300",
    );

    const mySection = screen
      .getByText("Mes tâches à échéance proche")
      .closest("section") as HTMLElement;
    expect(within(mySection).getByText("Ma tâche")).toBeInTheDocument();
    expect(within(mySection).queryByText("Tâche d'Alice")).not.toBeInTheDocument();
  });
});
