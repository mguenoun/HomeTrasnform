export type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export function parseFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map(parseFirestoreValue);
  }
  if ("mapValue" in value) return parseFirestoreFields(value.mapValue.fields ?? {});
  return undefined;
}

export function parseFirestoreFields(
  fields: Record<string, FirestoreValue>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseFirestoreValue(value);
  }
  return result;
}

export function docIdFromName(name: string): string {
  return name.split("/").pop() ?? name;
}
