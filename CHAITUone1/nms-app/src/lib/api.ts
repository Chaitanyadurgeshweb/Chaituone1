export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(path, options);
}
