import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Objective } from "../../types";
import { TaskForm } from "../TaskForm";

const objectives: Objective[] = [
  {
    id: "obj1",
    title: "Réaménager le salon",
    status: "active",
    createdBy: "u1",
    createdAt: 0,
  },
];

describe("TaskForm", () => {
  it("refuse la soumission sans titre", async () => {
    const onSubmit = vi.fn();
    render(<TaskForm objectives={objectives} onSubmit={onSubmit} />);

    await userEvent.click(
      screen.getByRole("button", { name: /créer la tâche/i }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/titre/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("affiche et exige le budget estimé pour un type achat", async () => {
    const onSubmit = vi.fn();
    render(<TaskForm objectives={objectives} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/titre/i), "Acheter une porte");
    await userEvent.selectOptions(screen.getByLabelText(/type/i), "achat");

    expect(screen.getByLabelText(/budget estimé/i)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /créer la tâche/i }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/budget/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("soumet les valeurs saisies quand le formulaire est valide", async () => {
    const onSubmit = vi.fn();
    render(<TaskForm objectives={objectives} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/titre/i), "Nettoyer le garage");
    await userEvent.selectOptions(
      screen.getByLabelText(/objectif/i),
      "obj1",
    );

    await userEvent.click(
      screen.getByRole("button", { name: /créer la tâche/i }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: "Nettoyer le garage",
      type: "menage",
      objectiveId: "obj1",
    });
  });
});
