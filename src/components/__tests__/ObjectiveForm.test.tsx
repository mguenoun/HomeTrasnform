import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ObjectiveForm } from "../ObjectiveForm";

describe("ObjectiveForm", () => {
  it("refuse la soumission sans titre", async () => {
    const onSubmit = vi.fn();
    render(<ObjectiveForm onSubmit={onSubmit} />);

    await userEvent.click(
      screen.getByRole("button", { name: /créer l'objectif/i }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/titre/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("soumet les valeurs saisies", async () => {
    const onSubmit = vi.fn();
    render(<ObjectiveForm onSubmit={onSubmit} />);

    await userEvent.type(
      screen.getByLabelText(/titre/i),
      "Réaménager le rez-de-chaussée",
    );

    await userEvent.click(
      screen.getByRole("button", { name: /créer l'objectif/i }),
    );

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Réaménager le rez-de-chaussée" }),
    );
  });
});
