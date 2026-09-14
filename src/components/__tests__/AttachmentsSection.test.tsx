import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAttachment,
  downloadAttachment,
  uploadAttachment,
} from "../../services/attachments";
import type { FamilyUser, TaskAttachment } from "../../types";
import { AttachmentsSection } from "../AttachmentsSection";

vi.mock("../../services/attachments", () => ({
  uploadAttachment: vi.fn().mockResolvedValue(undefined),
  downloadAttachment: vi.fn().mockResolvedValue(undefined),
  deleteAttachment: vi.fn().mockResolvedValue(undefined),
}));

const mockedUpload = vi.mocked(uploadAttachment);
const mockedDownload = vi.mocked(downloadAttachment);
const mockedDelete = vi.mocked(deleteAttachment);

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpload.mockResolvedValue(undefined);
    mockedDownload.mockResolvedValue(undefined);
    mockedDelete.mockResolvedValue(undefined);
  });

  it("affiche la liste des pièces jointes avec taille et auteur", () => {
    render(
      <AttachmentsSection
        taskId="task1"
        attachments={[ATTACHMENT]}
        currentUser={CURRENT_USER}
        users={USERS}
      />,
    );

    expect(screen.getByText("devis.pdf")).toBeInTheDocument();
    expect(screen.getByText(/2.4 Mo/)).toBeInTheDocument();
    expect(screen.getByText(/Marie/)).toBeInTheDocument();
  });

  it("affiche un message quand il n'y a aucune pièce jointe", () => {
    render(
      <AttachmentsSection
        taskId="task1"
        attachments={[]}
        currentUser={CURRENT_USER}
        users={USERS}
      />,
    );

    expect(screen.getByText("Aucune pièce jointe.")).toBeInTheDocument();
  });

  it("uploade le fichier sélectionné", async () => {
    render(
      <AttachmentsSection
        taskId="task1"
        attachments={[]}
        currentUser={CURRENT_USER}
        users={USERS}
      />,
    );

    const file = new File(["contenu"], "facture.pdf", {
      type: "application/pdf",
    });
    const input = screen.getByLabelText(/ajouter des pièces jointes/i);
    await userEvent.upload(input, file);

    expect(mockedUpload).toHaveBeenCalledWith("task1", file, CURRENT_USER);
  });

  it("affiche l'erreur renvoyée par le service en cas d'échec d'upload", async () => {
    mockedUpload.mockRejectedValue(new Error("Fichier trop volumineux."));
    render(
      <AttachmentsSection
        taskId="task1"
        attachments={[]}
        currentUser={CURRENT_USER}
        users={USERS}
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
        taskId="task1"
        attachments={[ATTACHMENT]}
        currentUser={CURRENT_USER}
        users={USERS}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /télécharger/i }),
    );
    expect(mockedDownload).toHaveBeenCalledWith("task1", ATTACHMENT);
  });

  it("supprime une pièce jointe après confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <AttachmentsSection
        taskId="task1"
        attachments={[ATTACHMENT]}
        currentUser={CURRENT_USER}
        users={USERS}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /supprimer/i }));
    expect(mockedDelete).toHaveBeenCalledWith("task1", ATTACHMENT);
  });

  it("ne supprime pas si l'utilisateur annule la confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <AttachmentsSection
        taskId="task1"
        attachments={[ATTACHMENT]}
        currentUser={CURRENT_USER}
        users={USERS}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /supprimer/i }));
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
