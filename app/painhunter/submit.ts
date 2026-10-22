/**
 * POST to a Painhunter route and read its JSON answer, so a form can save in
 * the background instead of reloading the page. The routes content-negotiate
 * (see lib/mutation-route.ts): `Accept: application/json` gets `{ ok, ... }`,
 * a plain form post still gets the 303 redirect.
 */
export async function postForm(url: string, body?: FormData): Promise<{ id?: string; redirectTo?: string }> {
	const res = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' }, body });
	const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; id?: string; redirectTo?: string } | null;
	if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Could not save.');
	return payload ?? {};
}
