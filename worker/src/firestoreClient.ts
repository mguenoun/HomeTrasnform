import { docIdFromName, parseFirestoreFields, type FirestoreValue } from "./firestoreDocs";

const BASE = "https://firestore.googleapis.com/v1";

export interface FirestoreDocument<T> {
  id: string;
  data: T;
}

async function firestoreFetch(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

export async function listDocuments<T>(
  projectId: string,
  collection: string,
  accessToken: string,
): Promise<FirestoreDocument<T>[]> {
  const documents: FirestoreDocument<T>[] = [];
  let pageToken: string | undefined;

  do {
    const query = new URLSearchParams({ pageSize: "300" });
    if (pageToken) query.set("pageToken", pageToken);

    const response = await firestoreFetch(
      `/projects/${projectId}/databases/(default)/documents/${collection}?${query.toString()}`,
      accessToken,
    );
    if (!response.ok) {
      throw new Error(
        `Lecture Firestore impossible (${response.status}): ${await response.text()}`,
      );
    }
    const data = (await response.json()) as {
      documents?: Array<{ name: string; fields?: Record<string, FirestoreValue> }>;
      nextPageToken?: string;
    };
    for (const document of data.documents ?? []) {
      documents.push({
        id: docIdFromName(document.name),
        data: parseFirestoreFields(document.fields ?? {}) as T,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return documents;
}

export async function getDocument<T>(
  projectId: string,
  path: string,
  accessToken: string,
): Promise<FirestoreDocument<T> | null> {
  const response = await firestoreFetch(
    `/projects/${projectId}/databases/(default)/documents/${path}`,
    accessToken,
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Lecture Firestore impossible (${response.status}): ${await response.text()}`,
    );
  }
  const document = (await response.json()) as {
    name: string;
    fields?: Record<string, FirestoreValue>;
  };
  return {
    id: docIdFromName(document.name),
    data: parseFirestoreFields(document.fields ?? {}) as T,
  };
}

export async function patchDocument(
  projectId: string,
  path: string,
  fields: Record<string, FirestoreValue>,
  accessToken: string,
): Promise<void> {
  const updateMask = Object.keys(fields)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join("&");
  const response = await firestoreFetch(
    `/projects/${projectId}/databases/(default)/documents/${path}?${updateMask}`,
    accessToken,
    { method: "PATCH", body: JSON.stringify({ fields }) },
  );
  if (!response.ok) {
    throw new Error(
      `Écriture Firestore impossible (${response.status}): ${await response.text()}`,
    );
  }
}
