import { exportPKCS8, generateKeyPair, jwtVerify, importSPKI, exportSPKI } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGoogleAccessToken } from "./googleAuth";

const TOKEN_URL = "https://oauth2.example.com/token";

async function makeTestServiceAccount() {
  const { publicKey, privateKey } = await generateKeyPair("RS256", {
    extractable: true,
  });
  return {
    clientEmail: "worker@test-project.iam.gserviceaccount.com",
    privateKeyPkcs8: await exportPKCS8(privateKey),
    publicKeySpki: await exportSPKI(publicKey),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getGoogleAccessToken", () => {
  it("signe une assertion JWT valide et échange contre un access_token", async () => {
    const account = await makeTestServiceAccount();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ access_token: "token-abc" }), { status: 200 }),
    );

    const token = await getGoogleAccessToken(
      { clientEmail: account.clientEmail, privateKey: account.privateKeyPkcs8 },
      TOKEN_URL,
    );

    expect(token).toBe("token-abc");
    expect(fetchMock).toHaveBeenCalledWith(
      TOKEN_URL,
      expect.objectContaining({ method: "POST" }),
    );

    const [, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init?.body as string);
    expect(body.get("grant_type")).toBe(
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
    );
    const assertion = body.get("assertion");
    expect(assertion).toBeTruthy();

    const publicKey = await importSPKI(account.publicKeySpki, "RS256");
    const { payload } = await jwtVerify(assertion!, publicKey, {
      issuer: account.clientEmail,
      audience: TOKEN_URL,
    });
    expect(payload.scope).toBe("https://www.googleapis.com/auth/datastore");
  });

  it("lève une erreur explicite si l'échange de token échoue", async () => {
    const account = await makeTestServiceAccount();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response("invalid_grant", { status: 400 }));

    await expect(
      getGoogleAccessToken(
        { clientEmail: account.clientEmail, privateKey: account.privateKeyPkcs8 },
        TOKEN_URL,
      ),
    ).rejects.toThrow(/Authentification Google impossible/);
  });
});
