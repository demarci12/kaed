'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { btnDanger } from '@/components/ui';

export function RemoveDraftButton({ postId, siteId, live }: { postId: string; siteId: string; live: boolean }) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	async function go() {
		if (!confirm(live ? 'Delete this live post? It will disappear from the site after a rebuild.' : 'Delete this post?')) return;
		const res = await fetch(`/api/cms/posts/${postId}/delete`, { method: 'POST', headers: { Accept: 'application/json' } });
		const payload = await res.json().catch(() => null);
		if (!res.ok || payload?.ok === false) { setError(payload?.error || 'Could not delete.'); return; }
		router.push(`/cms/${siteId}#posts`);
		router.refresh();
	}
	return (
		<span>
			<button type="button" className={btnDanger} onClick={go}>Delete</button>
			{error && <span className="ml-2 text-xs text-negative">{error}</span>}
		</span>
	);
}
