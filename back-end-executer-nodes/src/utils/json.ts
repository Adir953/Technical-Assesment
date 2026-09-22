// Harnesses print results as compact JSON, so expected outputs are normalized the same way.
export function canonicalJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
}
