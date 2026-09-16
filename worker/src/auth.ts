import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let cachedJwks: JWTVerifyGetKey | null = null;

function getRemoteJwks(): JWTVerifyGetKey {
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  }
  return cachedJwks;
}

export interface VerifiedUser {
  uid: string;
  email: string;
}

export class AuthError extends Error {}

// La clé publique Firebase n'est injectable que pour les tests (JWKS local
// signé par une paire de clés de test) ; en production, on utilise toujours
// le JWKS distant réel de Firebase.
export async function verifyFirebaseToken(
  authorizationHeader: string | null,
  projectId: string,
  getKey: JWTVerifyGetKey = getRemoteJwks(),
): Promise<VerifiedUser> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new AuthError("En-tête Authorization manquant ou invalide.");
  }
  const token = authorizationHeader.slice("Bearer ".length);

  let payload;
  try {
    const result = await jwtVerify(token, getKey, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    payload = result.payload;
  } catch (err) {
    throw new AuthError(
      `Token invalide (${err instanceof Error ? err.message : "erreur inconnue"}).`,
    );
  }

  if (typeof payload.email !== "string" || !payload.sub) {
    throw new AuthError("Le token ne contient pas d'email.");
  }

  return { uid: payload.sub, email: payload.email };
}
