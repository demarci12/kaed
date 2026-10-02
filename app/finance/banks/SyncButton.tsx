'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { btn, btnGhost, cx } from '@/components/ui';

interface Result { added: number; filed: number; error?: string }

/** Syncs one bank (`ids` of one) or all of them in turn. Manual only: PSD2 allows few unattended fetches a day. */
export function SyncButton({ ids, ghost, label = 'Sync now' }: { ids: string[]; ghost?: boolean; label?: string }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	async function run() {
		setBusy(true);
		setMessage(null);
		let added = 0;
		let filed = 0;
		const errors: string[] = [];
		for (const id of ids) {
			try {
				const res = await fetch(`/api/banking/connections/${id}/sync`, { method: 'POST' });
				const body = (await res.json()) as Result;
				added += body.added ?? 0;
				filed += body.filed ?? 0;
				if (body.error) errors.push(body.error);
			} catch {
				errors.push('Network error.');
			}
		}
		setBusy(false);
		setMessage(errors.length ? errors[0] : `${added} new, ${filed} filed automatically.`);
		router.refresh();
	}

	return (
		<span className="inline-flex items-center gap-2.5">
			<button type="button" onClick={run} disabled={busy || !ids.length} className={cx(ghost ? btnGhost : btn)}>
				{busy ? 'Syncing…' : label}
			</button>
			{message && <span className={cx('text-[13px]', message.includes(' new,') ? 'text-muted' : 'text-negative')}>{message}</span>}
		</span>
	);
}
