import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../AuthContext";

vi.mock("../../firebase/config", () => ({ auth: {}, db: {} }));

const getDocMock = vi.fn();
const signOutMock = vi.fn().mockResolvedValue(undefined);
const getRedirectResultMock = vi.fn().mockResolvedValue(null);
const signInWithRedirectMock = vi.fn().mockResolvedValue(undefined);

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: (
    _auth: unknown,
    callback: (user: { email: string } | null) => void,
  ) => {
    callback({ email: "member@example.com" });
    return () => {};
  },
  getRedirectResult: (...args: unknown[]) => getRedirectResultMock(...args),
  signInWithRedirect: (...args: unknown[]) => signInWithRedirectMock(...args),
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
  });

  it("utilise signInWithRedirect plutôt qu'une popup (évite les blocages COOP/extensions)", async () => {
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

    expect(signInWithRedirectMock).toHaveBeenCalled();
  });

  it("affiche une erreur si la redirection Google échoue", async () => {
    getRedirectResultMock.mockReset().mockRejectedValue(new Error("auth/network-request-failed"));
    getDocMock.mockResolvedValue({ exists: () => true });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    const status = await screen.findByText(/isAuthorized:/);
    expect(status).toHaveTextContent(/network-request-failed/i);
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
