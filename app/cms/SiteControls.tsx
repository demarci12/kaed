'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { btn, btnDanger, btnGhost, cx, deleteBtn } from '@/components/ui';

async function post(url: string): Promise<{ ok?: boolean; error?: string; [k: string]: unknown }> {
	const res = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
	const payload = await res.json().catch(() => null);
	if (!res.ok || payload?.ok === false) throw new Error(payload?.error || 'Something went wrong.');
	return payload;
}

/** Runs one posting-machine pass now: publishes what's due and generates the next article. Slow (~1 min). */
export function RunNowButton({ siteId }: { siteId: string }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

	async function run() {
		setBusy(true);
		setMsg(null);
		try {
			const { result } = (await post(`/api/cms/sites/${siteId}/run`)) as {
				result: { published: number; generated: string | null; notes: string[] };
			};
			const bits = [
				result.generated ? `Generated “${result.generated}”.` : '',
				result.published ? `Published ${result.published}.` : '',
				...result.notes,
			].filter(Boolean);
			setMsg({ text: bits.join(' ') || 'Nothing to do.', bad: !result.generated && result.notes.length > 0 });
			router.refresh();
		} catch (e) {
			setMsg({ text: e instanceof Error ? e.message : 'Run failed.', bad: true });
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex items-center gap-3 flex-wrap">
			<button type="button" className={btn} disabled={busy} onClick={run}>
				{busy ? 'Writing… (up to a minute)' : 'Write next post now'}
			</button>
			{msg && <span className={cx('text-sm', msg.bad ? 'text-negative' : 'text-muted')}>{msg.text}</span>}
		</div>
	);
}

export function RebuildButton({ siteId, disabled }: { siteId: string; disabled?: boolean }) {
	const [state, setState] = useState<'idle' | 'busy' | 'ok' | string>('idle');
	async function go() {
		setState('busy');
		try {
			await post(`/api/cms/sites/${siteId}/deploy`);
			setState('ok');
		} catch (e) {
			setState(e instanceof Error ? e.message : 'Failed.');
		}
	}
	return (
		<span className="inline-flex items-center gap-2">
			<button type="button" className={btnGhost} disabled={disabled || state === 'busy'} onClick={go}
				title={disabled ? 'Set a deploy hook first' : 'Trigger a rebuild of the site'}>
				{state === 'busy' ? 'Rebuilding…' : 'Rebuild site'}
			</button>
			{state === 'ok' && <span className="text-xs text-positive">Triggered</span>}
			{state !== 'idle' && state !== 'busy' && state !== 'ok' && <span className="text-xs text-negative">{state}</span>}
		</span>
	);
}

/** Issues a new API key and shows it once -- only a hash is stored, so it can't be read back later. */
export function ApiKeyPanel({ siteId, prefix }: { siteId: string; prefix: string | null }) {
	const [key, setKey] = useState<string | null>(null);
	const [currentPrefix, setCurrentPrefix] = useState(prefix);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	async function issue() {
		if (currentPrefix && !confirm('Issue a new key? The current one stops working immediately.')) return;
		setError(null);
		try {
			const res = (await post(`/api/cms/sites/${siteId}/api-key`)) as { key: string; prefix: string };
			setKey(res.key);
			setCurrentPrefix(res.prefix);
			setCopied(false);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not create a key.');
		}
	}

	return (
		<div className="flex flex-col gap-2">
			{key ? (
				<div className="p-3 rounded-[10px] border border-line bg-canvas">
					<p className="m-0 mb-1.5 text-xs text-muted">Copy it now — it will not be shown again.</p>
					<code className="block break-all font-mono text-[13px]">{key}</code>
					<button type="button" className={cx(btnGhost, 'mt-2.5 !min-h-8 !px-3 text-[13px]')}
						onClick={() => { navigator.clipboard?.writeText(key); setCopied(true); }}>
						{copied ? 'Copied' : 'Copy'}
					</button>
				</div>
			) : (
				<p className="m-0 text-sm text-muted">
					{currentPrefix ? <>Current key: <code className="font-mono">{currentPrefix}…</code></> : 'No key yet — the site cannot read posts until you create one.'}
				</p>
			)}
			<div>
				<button type="button" className={btnGhost} onClick={issue}>{currentPrefix ? 'Regenerate key' : 'Create API key'}</button>
			</div>
			{error && <p className="m-0 text-sm text-negative">{error}</p>}
		</div>
	);
}

/** Weekday toggles; saves the whole set through the site field route. */
export function ScheduleDays({ siteId, days, order }: { siteId: string; days: number[]; order: [number, string][] }) {
	const [selected, setSelected] = useState(new Set(days));
	const [error, setError] = useState<string | null>(null);

	async function toggle(d: number) {
		const next = new Set(selected);
		if (next.has(d)) next.delete(d); else next.add(d);
		if (!next.size) return;
		const before = selected;
		setSelected(next);
		setError(null);
		try {
			const res = await fetch(`/api/cms/sites/${siteId}/field`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field: 'schedule_days', value: [...next].sort().join(',') }),
			});
			if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Could not save.');
		} catch (e) {
			setSelected(before);
			setError(e instanceof Error ? e.message : 'Could not save.');
		}
	}

	return (
		<div>
			<div className="flex gap-1.5 flex-wrap">
				{order.map(([d, name]) => (
					<button key={d} type="button" onClick={() => toggle(d)} aria-pressed={selected.has(d)}
						className={cx('px-3 py-1 rounded-full border text-[13px] cursor-pointer',
							selected.has(d) ? 'bg-ink text-white border-ink' : 'bg-paper text-muted border-line hover:border-ink')}>
						{name}
					</button>
				))}
			</div>
			{error && <p className="mt-1.5 mb-0 text-xs text-negative">{error}</p>}
		</div>
	);
}

/** Puts a failed idea back in the queue. */
export function RequeueButton({ ideaId }: { ideaId: string }) {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	async function go() {
		setBusy(true);
		await fetch(`/api/cms/ideas/${ideaId}/field`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ field: 'status', value: 'queued' }),
		});
		router.refresh();
	}
	return <button type="button" className={cx(deleteBtn, '!w-auto px-2.5 text-xs')} disabled={busy} onClick={go}>↺ Retry</button>;
}

export function DeleteSiteButton({ siteId }: { siteId: string }) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	async function go() {
		if (!confirm('Delete this site with all its posts and ideas? This cannot be undone.')) return;
		try {
			await post(`/api/cms/sites/${siteId}/delete`);
			router.push('/cms');
			router.refresh();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not delete.');
		}
	}
	return (
		<div>
			<button type="button" className={btnDanger} onClick={go}>Delete this site and all its posts</button>
			{error && <p className="mt-2 mb-0 text-sm text-negative">{error}</p>}
		</div>
	);
}
