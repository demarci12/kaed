'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { Popup, PopupActions } from '@/components/Popup';
import { btn, FormError, input, label, textarea } from '@/components/ui';
import { PAIN_SOURCE_OPTION_LABELS, PAIN_SOURCES } from '@/lib/painhunter';
import { postForm } from './submit';

export function NewPainPopup() {
	return (
		<Popup title="Log a pain" trigger={(open) => <button type="button" className={btn} onClick={open}>+ Log a pain</button>}>
			{(close) => <PainForm close={close} />}
		</Popup>
	);
}

/** Saves in the background, closes the dialog and refreshes the list in place -- no page reload. */
function PainForm({ close }: { close: () => void }) {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [refreshing, startRefresh] = useTransition();
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = e.currentTarget;
		setSaving(true);
		setError(null);
		try {
			await postForm('/api/painhunter/create', new FormData(form));
			form.reset();
			close();
			startRefresh(() => router.refresh());
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not save.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<form method="post" action="/api/painhunter/create" onSubmit={onSubmit}>
			<label className={label} htmlFor="title">The pain</label>
			<input className={input} id="title" name="title" type="text" required maxLength={200} placeholder="What is slow, manual, annoying or expensive?" />

			<label className={label} htmlFor="details">What happens</label>
			<textarea className={textarea} id="details" name="details" rows={2} placeholder="The problem, not the solution." />

			<label className={label} htmlFor="source">Where did you find it?</label>
			<select className={input} id="source" name="source" defaultValue="journal">
				{PAIN_SOURCES.map((s) => <option key={s} value={s}>{PAIN_SOURCE_OPTION_LABELS[s]}</option>)}
			</select>

			<label className={label} htmlFor="context">Context</label>
			<input className={input} id="context" name="context" type="text" maxLength={80} placeholder="Work, home, university, a bank, the doctor..." />

			<label className={label} htmlFor="who">Who has it</label>
			<textarea className={textarea} id="who" name="who" rows={2} placeholder="Role, industry, company size -- someone you could reach." />

			<label className={label} htmlFor="workaround">How it is handled today</label>
			<textarea className={textarea} id="workaround" name="workaround" rows={2} placeholder="Excel, paper, email, a consultant, an agency?" />

			<label className={label} htmlFor="noticed_on">Noticed on</label>
			<input className={input} id="noticed_on" name="noticed_on" type="date" />
			<p className="mt-1.5 mb-0 text-xs text-muted">Leave empty for today.</p>

			{error && <FormError>{error}</FormError>}
			<PopupActions onCancel={close} submitLabel="Log pain" busy={saving || refreshing} />
		</form>
	);
}
