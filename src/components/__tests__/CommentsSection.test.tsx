import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addComment } from "../../services/comments";
import type { FamilyUser, TaskComment } from "../../types";
import { CommentsSection } from "../CommentsSection";

vi.mock("../../services/comments", () => ({
  addComment: vi.fn().mockResolvedValue(undefined),
}));

const mockedAddComment = vi.mocked(addComment);

const USERS: FamilyUser[] = [
  { uid: "user-1", displayName: "Marie", email: "marie@example.com" },
];

const COMMENT: TaskComment = {
  id: "c1",
  taskId: "task1",
  authorId: "user-1",
  text: "Devis reçu, on valide ?",
  createdAt: Date.parse("2026-02-01T10:00:00"),
};

describe("CommentsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAddComment.mockResolvedValue(undefined);
  });

  it("affiche les commentaires existants avec auteur et date", () => {
    render(
      <CommentsSection
        taskId="task1"
        comments={[COMMENT]}
        currentUserId="user-1"
        users={USERS}
      />,
    );

    expect(screen.getByText("Devis reçu, on valide ?")).toBeInTheDocument();
    expect(screen.getByText(/Marie/)).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucun commentaire", () => {
    render(
      <CommentsSection
        taskId="task1"
        comments={[]}
        currentUserId="user-1"
        users={USERS}
      />,
    );

    expect(screen.getByText("Aucun commentaire.")).toBeInTheDocument();
  });

  it("désactive l'envoi tant que le champ est vide", () => {
    render(
      <CommentsSection
        taskId="task1"
        comments={[]}
        currentUserId="user-1"
        users={USERS}
      />,
    );

    expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
  });

  it("envoie le commentaire saisi puis vide le champ", async () => {
    render(
      <CommentsSection
        taskId="task1"
        comments={[]}
        currentUserId="user-1"
        users={USERS}
      />,
    );

    const textarea = screen.getByLabelText(/ajouter un commentaire/i);
    await userEvent.type(textarea, "Nouveau commentaire");
    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    expect(mockedAddComment).toHaveBeenCalledWith(
      "task1",
      "Nouveau commentaire",
      "user-1",
    );
    expect(textarea).toHaveValue("");
  });

  it("affiche l'erreur si l'envoi échoue", async () => {
    mockedAddComment.mockRejectedValue(new Error("Erreur réseau."));
    render(
      <CommentsSection
        taskId="task1"
        comments={[]}
        currentUserId="user-1"
        users={USERS}
      />,
    );

    const textarea = screen.getByLabelText(/ajouter un commentaire/i);
    await userEvent.type(textarea, "Test");
    await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur réseau.",
    );
  });
});
