import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from "jose";
import { describe, expect, it } from "vitest";
import { AuthError, verifyFirebaseToken } from "./auth";

const PROJECT_ID = "test-project";

async function makeTestKeys() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  const jwks = createLocalJWKSet({ keys: [jwk] });

  async function sign(
    claims: Record<string, unknown>,
    overrides: { issuer?: string; audience?: string } = {},
  ) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuedAt()
      .setIssuer(overrides.issuer ?? `https://securetoken.google.com/${PROJECT_ID}`)
      .setAudience(overrides.audience ?? PROJECT_ID)
      .setExpirationTime("1h")
      .setSubject("uid-1")
      .sign(privateKey);
  }

  return { jwks, sign };
}

describe("verifyFirebaseToken", () => {
  it("accepte un token valide et retourne uid + email", async () => {
    const { jwks, sign } = await makeTestKeys();
    const token = await sign({ email: "marie@example.com" });

    const user = await verifyFirebaseToken(`Bearer ${token}`, PROJECT_ID, jwks);

    expect(user).toEqual({ uid: "uid-1", email: "marie@example.com" });
  });

  it("rejette une requête sans en-tête Authorization", async () => {
    const { jwks } = await makeTestKeys();
    await expect(
      verifyFirebaseToken(null, PROJECT_ID, jwks),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("rejette un token dont l'audience ne correspond pas au projet", async () => {
    const { jwks, sign } = await makeTestKeys();
    const token = await sign(
      { email: "marie@example.com" },
      { audience: "autre-projet" },
    );
    await expect(
      verifyFirebaseToken(`Bearer ${token}`, PROJECT_ID, jwks),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("rejette un token sans email", async () => {
    const { jwks, sign } = await makeTestKeys();
    const token = await sign({});
    await expect(
      verifyFirebaseToken(`Bearer ${token}`, PROJECT_ID, jwks),
    ).rejects.toThrow(/email/);
  });
});
