type SessionReader = {
  auth: { getSession(): Promise<{ data: { session: { user: { id: string } } | null } }> };
};

/**
 * The signed-in user's id as the browser's session cookie has it right now.
 * getSession reads the cookie each time it is asked, so this sees a session
 * the server wrote (sign-up, sign-in) without a reload.
 */
export async function readSessionUserId(client: SessionReader): Promise<string | null> {
  try {
    const { data } = await client.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}
