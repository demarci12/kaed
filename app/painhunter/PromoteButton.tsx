'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { btnGhost } from '@/components/ui';
import { postForm } from './submit';

/** "→ Make it a business idea": creates and links the idea in the background, then opens it without a reload. */
export function PromoteButton({ painId }: { painId: string }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function promote() {
		setBusy(true);
		setError(null);
		try {
			const { redirectTo } = await postForm(`/api/painhunter/${painId}/promote`);
			router.push(redirectTo ?? '/business-ideas');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not create the idea.');
			setBusy(false);
		}
	}

	return (
		<div className="m-0 self-end">
			<button type="button" className={btnGhost} disabled={busy} onClick={promote}>
				{busy ? 'Creating…' : '→ Make it a business idea'}
			</button>
			{error && <p className="mt-1.5 mb-0 text-xs text-[--color-negative]">{error}</p>}
		</div>
	);
}
