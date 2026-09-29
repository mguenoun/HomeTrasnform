import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../AuthContext";

vi.mock("../../firebase/config", () => ({ auth: {}, db: {} }));

const getDocMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);
const signInWithRedirectMock = vi.fn().mockResolvedValue(undefined);
const getRedirectResultMock = vi.fn().mockResolvedValue(null);
const upsertUserProfileMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../../services/users", () => ({
  upsertUserProfile: (...args: unknown[]) => upsertUserProfileMock(...args),
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: (
    _auth: unknown,
    callback: (
      user: { uid: string; email: string; displayName: string } | null,
    ) => void,
  ) => {
    callback({
      uid: "member-uid",
      email: "member@example.com",
      displayName: "Membre Test",
    });
    return () => {};
  },
  signInWithRedirect: (...args: unknown[]) => signInWithRedirectMock(...args),
  getRedirectResult: (...args: unknown[]) => getRedirectResultMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: (...args: unknown[]) => getDocMock(...args),
}));

function Probe() {
  const { loading, isAuthorized, error } = useAuth();
  if (loading) return <p>Chargement...</p>;
  return (
    <p>
      isAuthorized: {String(isAuthorized)} / error: {error ?? "aucune"}
    </p>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    signInWithRedirectMock.mockReset().mockResolvedValue(undefined);
    getRedirectResultMock.mockReset().mockResolvedValue(null);
    upsertUserProfileMock.mockReset().mockResolvedValue(undefined);
  });

  it("utilise signInWithRedirect pour se connecter (évite les alertes de sécurité Google en PWA)", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });

    function TriggerSignIn() {
      const { signInWithGoogle } = useAuth();
      signInWithGoogle();
      return null;
    }

    render(
      <AuthProvider>
        <TriggerSignIn />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(signInWithRedirectMock).toHaveBeenCalled();
    });
  });

  it("affiche une erreur si la redirection de connexion échoue", async () => {
    // Ne jamais résoudre : évite que le flux onAuthStateChanged (déclenché par le
    // mock ci-dessus dès le montage) efface l'erreur via son setError(null) de
    // succès, ce qui n'a aucun rapport avec ce que ce test vérifie. Lit `error`
    // directement (sans passer par le garde `loading` de Probe), puisque le
    // chargement reste bloqué tant que getDoc() ne se résout pas.
    getDocMock.mockReturnValue(new Promise(() => {}));
    getRedirectResultMock.mockRejectedValueOnce(
      new Error("auth/redirect-cancelled-by-user"),
    );

    function ErrorProbe() {
      const { error } = useAuth();
      return <p>error: {error ?? "aucune"}</p>;
    }

    render(
      <AuthProvider>
        <ErrorProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/error:/)).toHaveTextContent(
        /redirect-cancelled-by-user/i,
      );
    });
  });

  it("ne reste pas bloqué en chargement quand Firestore refuse la lecture (règles non déployées)", async () => {
    getDocMock.mockRejectedValue(
      Object.assign(new Error("Missing or insufficient permissions."), {
        code: "permission-denied",
      }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    const status = await screen.findByText(/isAuthorized:/);
    expect(status).toHaveTextContent("isAuthorized: false");
    expect(status).toHaveTextContent(/insufficient permissions/i);
    expect(signOutMock).toHaveBeenCalled();
  });

  it("autorise l'utilisateur quand le document familymembers existe", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    const status = await screen.findByText(/isAuthorized:/);
    expect(status).toHaveTextContent("isAuthorized: true");
  });

  it("met à jour le profil users/{uid} une fois l'accès autorisé", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await screen.findByText(/isAuthorized: true/);
    expect(upsertUserProfileMock).toHaveBeenCalledWith({
      uid: "member-uid",
      displayName: "Membre Test",
      email: "member@example.com",
    });
  });
});
