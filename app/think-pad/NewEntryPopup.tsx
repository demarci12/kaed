'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label, textarea } from '@/components/ui';

export function NewEntryPopup() {
	return (
		<Popup title="New thought" trigger={(open) => <button type="button" className={btn} onClick={open}>+ New thought</button>}>
			{(close) => (
				<form method="post" action="/api/think-pad/create">
					<label className={label} htmlFor="title">Title (optional)</label>
					<input className={input} id="title" name="title" type="text" maxLength={160} />

					<label className={label} htmlFor="body">Thought</label>
					<textarea className={textarea} id="body" name="body" rows={5} required autoFocus placeholder="What's on your mind…" />

					<PopupActions onCancel={close} submitLabel="Save" />
				</form>
			)}
		</Popup>
	);
}
