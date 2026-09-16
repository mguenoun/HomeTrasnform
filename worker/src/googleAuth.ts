import { SignJWT, importPKCS8 } from "jose";

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";

// Flux JWT-bearer (RFC 7523) : on signe une assertion avec la clé privée du
// compte de service Firebase (gratuit, aucune carte bancaire requise) pour
// obtenir un token OAuth2 donnant un accès complet à Firestore, sans passer
// par les règles de sécurité (équivalent à l'Admin SDK).
export async function getGoogleAccessToken(
  account: ServiceAccount,
  tokenUrl: string = TOKEN_URL,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(account.privateKey, "RS256");
  const assertion = await new SignJWT({ scope: FIRESTORE_SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(account.clientEmail)
    .setSubject(account.clientEmail)
    .setAudience(tokenUrl)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Authentification Google impossible (${response.status}): ${await response.text()}`,
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}
