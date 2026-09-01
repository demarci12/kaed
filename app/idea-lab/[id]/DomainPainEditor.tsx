'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
	DOMAIN_PAIN_LEGACY_KEY, composeDomainPain, parseDomainPain, splitDomains,
	type DomainPainMap,
} from '@/lib/idea-lab';
import { cardLabel, cardValue, cx, Empty, textarea } from '@/components/ui';

/**
 * Step 2, linked to Step 1: one pain-mining field per domain you actually
 * listed, instead of one flat disconnected textarea. Deliberately narrow --
 * a domain list and a matching field per line, nothing else -- unlike the
 * fuller worksheet rebuild (timers, sentence builders, checkboxes) that got
 * reverted for being more than was asked for.
 */
export function DomainPainEditor({ candidateId, domainsRaw, initialPainRaw }: {
	candidateId: string;
	domainsRaw: string | null;
	initialPainRaw: string | null;
}) {
	const router = useRouter();
	const domains = splitDomains(domainsRaw);
	const [map, setMap] = useState<DomainPainMap>(() => parseDomainPain(initialPainRaw));
	const [saving, setSaving] = useState(false);

	async function save(next: DomainPainMap) {
		setMap(next);
		setSaving(true);
		try {
			const res = await fetch(`/api/idea-lab/${candidateId}/field`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field: 'personal_pain', value: composeDomainPain(next) }),
			});
			if (!res.ok) throw new Error('save failed');
			router.refresh();
		} catch (e) {
			console.error(e);
		} finally {
			setSaving(false);
		}
	}

	if (!domains.length) {
		return (
			<Empty>
				List your domains in Step 1 first -- one per line. This step mines pain within each one you name.
			</Empty>
		);
	}

	// Entries whose domain no longer appears in Step 1's current list (you
	// edited Step 1 after writing here) -- kept and shown, never silently
	// hidden just because the domain line changed or was removed.
	const orphaned = Object.keys(map).filter((k) => k !== DOMAIN_PAIN_LEGACY_KEY && !domains.includes(k));

	return (
		<div className={cx('flex flex-col gap-4', saving && 'opacity-70 transition-opacity')}>
			{map[DOMAIN_PAIN_LEGACY_KEY] && (
				<div className="p-3.5 rounded-[10px] border border-line bg-canvas">
					<p className="m-0 text-xs text-muted uppercase tracking-[0.06em] font-semibold">Note from before this was domain-linked</p>
					<p className="mt-1.5 mb-0 text-sm whitespace-pre-wrap">{map[DOMAIN_PAIN_LEGACY_KEY]}</p>
				</div>
			)}

			{domains.map((domain) => (
				<div key={domain}>
					<label className={cardLabel} htmlFor={`pain-${domain}`}>{domain}</label>
					<textarea
						id={`pain-${domain}`}
						className={cx('block mt-1.5', textarea, cardValue)}
						rows={2}
						placeholder="What's the pain here -- money spent, workarounds, repeat searches, complaints, 'why doesn't this exist' moments?"
						defaultValue={map[domain] ?? ''}
						onBlur={(e) => save({ ...map, [domain]: e.target.value })}
					/>
				</div>
			))}

			{orphaned.length > 0 && (
				<div className="mt-2 pt-4 border-t border-line">
					<p className="m-0 mb-3 text-xs text-muted uppercase tracking-[0.06em] font-semibold">
						No longer in your Step 1 list
					</p>
					{orphaned.map((domain) => (
						<div key={domain} className="mb-3">
							<label className={cardLabel} htmlFor={`pain-orphan-${domain}`}>{domain}</label>
							<textarea
								id={`pain-orphan-${domain}`}
								className={cx('block mt-1.5', textarea, cardValue)}
								rows={2}
								defaultValue={map[domain] ?? ''}
								onBlur={(e) => save({ ...map, [domain]: e.target.value })}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
