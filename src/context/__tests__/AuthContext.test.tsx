import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../AuthContext";

vi.mock("../../firebase/config", () => ({ auth: {}, db: {} }));

const getDocMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);
const getRedirectResultMock = vi.fn().mockResolvedValue(null);
const signInWithPopupMock = vi.fn().mockResolvedValue(undefined);
const setPersistenceMock = vi.fn().mockResolvedValue(undefined);

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  browserLocalPersistence: "browserLocalPersistence",
  onAuthStateChanged: (
    _auth: unknown,
    callback: (user: { email: string } | null) => void,
  ) => {
    callback({ email: "member@example.com" });
    return () => {};
  },
  getRedirectResult: (...args: unknown[]) => getRedirectResultMock(...args),
  setPersistence: (...args: unknown[]) => setPersistenceMock(...args),
  signInWithPopup: (...args: unknown[]) => signInWithPopupMock(...args),
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
    getRedirectResultMock.mockReset().mockResolvedValue(null);
    signInWithPopupMock.mockReset().mockResolvedValue(undefined);
  });

  it("utilise signInWithPopup pour se connecter", async () => {
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
      expect(signInWithPopupMock).toHaveBeenCalled();
    });
  });

  it("affiche une erreur si la connexion par popup échoue", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });
    signInWithPopupMock.mockRejectedValueOnce(new Error("auth/popup-closed-by-user"));

    function TriggerSignIn() {
      const { signInWithGoogle, error } = useAuth();
      signInWithGoogle();
      return <p>error: {error ?? "aucune"}</p>;
    }

    render(
      <AuthProvider>
        <TriggerSignIn />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/error:/)).toHaveTextContent(/popup-closed-by-user/i);
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

  it("autorise l'utilisateur quand le document familyMembers existe", async () => {
    getDocMock.mockResolvedValue({ exists: () => true });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    const status = await screen.findByText(/isAuthorized:/);
    expect(status).toHaveTextContent("isAuthorized: true");
  });
});
