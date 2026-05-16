export async function getClerkApiToken(
  getToken: () => Promise<string | null>,
  userId?: string | null,
): Promise<string | null> {
  return (await getToken()) ?? (userId ? `user:${userId}` : null);
}
