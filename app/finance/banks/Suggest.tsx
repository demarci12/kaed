'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { btnGhost, cx } from '@/components/ui';
import type { Confidence } from '@/lib/bank-categorize';

interface Suggestion { categoryId: string; confidence: Confidence }
interface Ctx {
	suggestions: Record<string, Suggestion>;
	busy: boolean;
	error: string | null;
	run: () => Promise<void>;
}

const SuggestContext = createContext<Ctx | null>(null);

/** Optional hook: lets SyncButton ask for suggestions after a sync without requiring the provider. */
export const useSuggest = () => useContext(SuggestContext);

/** Holds Claude's suggestions for the inbox. Nothing is saved; they only pre-fill the pickers. */
export function SuggestProvider({ children }: { children: ReactNode }) {
	const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const run = useCallback(async () => {
		setBusy(true);
		setError(null);
		try {
			const res = await fetch('/api/banking/suggest', { method: 'POST' });
			const body = (await res.json()) as { ok: boolean; error?: string; suggestions?: Record<string, Suggestion> };
			if (!body.ok) throw new Error(body.error ?? 'Suggesting failed.');
			setSuggestions(body.suggestions ?? {});
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Suggesting failed.');
		} finally {
			setBusy(false);
		}
	}, []);

	return <SuggestContext.Provider value={{ suggestions, busy, error, run }}>{children}</SuggestContext.Provider>;
}

export function SuggestButton() {
	const s = useSuggest();
	if (!s) return null;
	const count = Object.keys(s.suggestions).length;
	return (
		<span className="inline-flex items-center gap-2.5">
			<button type="button" onClick={s.run} disabled={s.busy} className={btnGhost}>
				{s.busy ? 'Asking Claude…' : 'Suggest with Claude'}
			</button>
			{s.error ? <span className="text-[13px] text-negative">{s.error}</span> : count > 0 && <span className="text-[13px] text-muted">{count} suggested</span>}
		</span>
	);
}

export interface CategoryOption { id: string; name: string; type: 'income' | 'expense' | 'saving' }

const control = 'min-w-0 font-sans text-sm text-ink bg-canvas border border-line rounded-lg px-2.5 py-1.5 outline-none focus:border-ink';

/** The inbox row's File form. A suggestion pre-selects the category unless the owner already picked one. */
export function FileForm({ txId, categories, defaultHuf, foreign }: {
	txId: string; categories: CategoryOption[]; defaultHuf: number | null; foreign: boolean;
}) {
	const suggestion = useSuggest()?.suggestions[txId];
	const [categoryId, setCategoryId] = useState('');
	const touched = useRef(false);

	useEffect(() => {
		if (suggestion && !touched.current) setCategoryId(suggestion.categoryId);
	}, [suggestion]);

	return (
		<form id={`tx-${txId}`} method="post" action={`/api/banking/transactions/${txId}/assign`} className="flex flex-wrap items-center gap-2">
			<select
				name="category_id"
				required
				value={categoryId}
				onChange={(e) => { touched.current = true; setCategoryId(e.target.value); }}
				className={cx(control, 'min-w-36')}
			>
				<option value="" disabled>Category…</option>
				{(['expense', 'income', 'saving'] as const).map((t) => (
					<optgroup key={t} label={t[0].toUpperCase() + t.slice(1)}>
						{categories.filter((c) => c.type === t).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
					</optgroup>
				))}
			</select>
			{suggestion && !touched.current && (
				<span className={cx('text-[11px] font-medium', suggestion.confidence === 'high' ? 'text-positive' : 'text-muted')}>Claude · {suggestion.confidence}</span>
			)}
			<label className="flex items-center gap-1 text-xs text-muted">
				<input name="huf_amount" type="number" step="0.01" min="0.01" required defaultValue={defaultHuf ?? ''} placeholder="HUF" className={cx(control, 'w-24')} />
				{foreign ? 'HUF (converted)' : 'HUF'}
			</label>
			<label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" name="remember" defaultChecked /> Remember</label>
			<button type="submit" className={btnGhost}>File</button>
			<button type="submit" formAction={`/api/banking/transactions/${txId}/ignore`} formNoValidate className="bg-transparent border-0 p-0 text-xs text-muted underline cursor-pointer hover:text-ink">Ignore</button>
		</form>
	);
}
