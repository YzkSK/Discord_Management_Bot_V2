export function optionalParam(query: URLSearchParams, key: string) {
  const value = query.get(key)?.trim();
  return value ? value : undefined;
}
