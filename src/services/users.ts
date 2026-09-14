import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { FamilyUser } from "../types";

const USERS_COLLECTION = "users";

export function subscribeToUsers(
  onChange: (users: FamilyUser[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
    const users = snapshot.docs.map(
      (docSnapshot) => ({ uid: docSnapshot.id, ...docSnapshot.data() }) as FamilyUser,
    );
    onChange(users);
  });
}

export async function upsertUserProfile(user: FamilyUser): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, user.uid), user, { merge: true });
}
