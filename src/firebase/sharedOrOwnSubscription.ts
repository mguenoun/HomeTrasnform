import {
  onSnapshot,
  query,
  where,
  type CollectionReference,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

/**
 * S'abonne à une collection dont les documents sont soit partagés
 * (`visibility: "shared"`), soit privés et visibles seulement par leur
 * créateur (`visibility: "private"` + `createdBy` == l'utilisateur courant).
 *
 * Pourquoi deux requêtes fusionnées plutôt qu'un onSnapshot(collection(...))
 * sans filtre : Firestore n'applique pas les règles de sécurité document par
 * document sur une requête de liste sans `where()` correspondant à la
 * condition de la règle — un objectif/tâche/rubrique privé de quelqu'un
 * d'autre pouvait fuiter dans une liste non filtrée même si un getDoc()
 * ciblé le refusait correctement (voir le commentaire dans
 * firebase-rules/firestore.rules et firebase-rules/__tests__/firestore.rules.test.ts
 * pour la reproduction). Les deux requêtes ci-dessous, elles, sont
 * directement prouvables par Firestore à partir de leur propre `where()` et
 * donc correctement appliquées même en liste.
 */
export function subscribeSharedOrOwn<T extends { id: string }>(
  collectionRef: CollectionReference<DocumentData>,
  uid: string,
  mapDoc: (docSnapshot: QueryDocumentSnapshot<DocumentData>) => T,
  onChange: (items: T[]) => void,
  onMineSnapshot?: (docs: QueryDocumentSnapshot<DocumentData>[]) => void,
): Unsubscribe {
  let mine = new Map<string, T>();
  let shared = new Map<string, T>();

  function emit() {
    const merged = new Map(shared);
    for (const [id, item] of mine) merged.set(id, item);
    onChange(Array.from(merged.values()));
  }

  const unsubMine = onSnapshot(
    query(collectionRef, where("createdBy", "==", uid)),
    (snapshot) => {
      mine = new Map(snapshot.docs.map((d) => [d.id, mapDoc(d)]));
      emit();
      onMineSnapshot?.(snapshot.docs);
    },
  );

  const unsubShared = onSnapshot(
    query(collectionRef, where("visibility", "==", "shared")),
    (snapshot) => {
      shared = new Map(snapshot.docs.map((d) => [d.id, mapDoc(d)]));
      emit();
    },
  );

  return () => {
    unsubMine();
    unsubShared();
  };
}
