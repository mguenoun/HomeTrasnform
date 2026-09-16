/**
 * Firestore's updateDoc()/setDoc() throw at runtime if any field value is
 * `undefined` (a value must be omitted entirely, or explicitly `null`, to
 * mean "no value"). This silently breaks any save button wired to a form
 * with optional fields left blank, with no visible error unless the caller
 * remembers to catch and surface it. Used as a defensive last line in the
 * update-style service functions, on top of callers passing `null` for
 * "cleared" fields.
 */
export function stripUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}
