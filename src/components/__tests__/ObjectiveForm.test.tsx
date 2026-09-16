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

  it("affiche l'erreur si l'enregistrement échoue, au lieu de rester silencieusement bloqué", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Erreur réseau."));
    render(<ObjectiveForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/titre/i), "Grand ménage");
    await userEvent.click(
      screen.getByRole("button", { name: /créer l'objectif/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur réseau.",
    );
  });
});
