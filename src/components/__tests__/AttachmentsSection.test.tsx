import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FamilyUser, TaskAttachment } from "../../types";
import { AttachmentsSection } from "../AttachmentsSection";

const CURRENT_USER = { uid: "user-1" } as never;

const USERS: FamilyUser[] = [
  { uid: "user-1", displayName: "Marie", email: "marie@example.com" },
];

const ATTACHMENT: TaskAttachment = {
  id: "att1",
  taskId: "task1",
  fileName: "devis.pdf",
  contentType: "application/pdf",
  size: 2_500_000,
  chunkCount: 4,
  uploadedBy: "user-1",
  uploadedAt: Date.parse("2026-01-15"),
};

describe("AttachmentsSection", () => {
  const onUpload = vi.fn();
  const onDownload = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onUpload.mockResolvedValue(undefined);
    onDownload.mockResolvedValue(undefined);
    onDelete.mockResolvedValue(undefined);
  });

  it("affiche la liste des pièces jointes avec taille et auteur", () => {
    render(
      <AttachmentsSection
        attachments={[ATTACHMENT]}
        currentUser={CURRENT_USER}
        users={USERS}
        onUpload={onUpload}
        onDownload={onDownload}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("devis.pdf")).toBeInTheDocument();
    expect(screen.getByText(/2.4 Mo/)).toBeInTheDocument();
    expect(screen.getByText(/Marie/)).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucune pièce jointe", () => {
    render(
      <AttachmentsSection
        attachments={[]}
        currentUser={CURRENT_USER}
        users={USERS}
        onUpload={onUpload}
        onDownload={onDownload}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Aucune pièce jointe.")).toBeInTheDocument();
  });

  it("uploade le fichier sélectionné", async () => {
    render(
      <AttachmentsSection
        attachments={[]}
        currentUser={CURRENT_USER}
        users={USERS}
        onUpload={onUpload}
        onDownload={onDownload}
        onDelete={onDelete}
      />,
    );

    const file = new File(["contenu"], "facture.pdf", {
      type: "application/pdf",
    });
    const input = screen.getByLabelText(/ajouter des pièces jointes/i);
    await userEvent.upload(input, file);

    expect(onUpload).toHaveBeenCalledWith(file, CURRENT_USER);
  });

  it("affiche l'erreur renvoyée par le gestionnaire en cas d'échec d'upload", async () => {
    onUpload.mockRejectedValue(new Error("Fichier trop volumineux."));
    render(
      <AttachmentsSection
        attachments={[]}
        currentUser={CURRENT_USER}
        users={USERS}
        onUpload={onUpload}
        onDownload={onDownload}
        onDelete={onDelete}
      />,
    );

    const file = new File(["contenu"], "gros.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText(/ajouter des pièces jointes/i);
    await userEvent.upload(input, file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Fichier trop volumineux.",
    );
  });

  it("télécharge une pièce jointe au clic", async () => {
    render(
      <AttachmentsSection
        attachments={[ATTACHMENT]}
        currentUser={CURRENT_USER}
        users={USERS}
        onUpload={onUpload}
        onDownload={onDownload}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /télécharger/i }),
    );
    expect(onDownload).toHaveBeenCalledWith(ATTACHMENT);
  });

  it("supprime une pièce jointe après confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <AttachmentsSection
        attachments={[ATTACHMENT]}
        currentUser={CURRENT_USER}
        users={USERS}
        onUpload={onUpload}
        onDownload={onDownload}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /supprimer/i }));
    expect(onDelete).toHaveBeenCalledWith(ATTACHMENT);
  });

  it("ne supprime pas si l'utilisateur annule la confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <AttachmentsSection
        attachments={[ATTACHMENT]}
        currentUser={CURRENT_USER}
        users={USERS}
        onUpload={onUpload}
        onDownload={onDownload}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /supprimer/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
