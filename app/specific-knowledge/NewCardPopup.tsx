'use client';

import { KNOWLEDGE_KIND_LABELS } from '@/lib/knowledge';
import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label, textarea } from '@/components/ui';

export function NewCardPopup() {
	return (
		<Popup title="Add knowledge card" trigger={(open) => <button type="button" className={btn} onClick={open}>+ Add card</button>}>
			{(close) => (
				<form method="post" action="/api/knowledge-cards/create">
					<label className={label} htmlFor="title">Title</label>
					<input className={input} id="title" name="title" type="text" required maxLength={160} placeholder="e.g. Reading systems under load" />

					<label className={label} htmlFor="kind">Kind</label>
					<select className={input} id="kind" name="kind" defaultValue="">
						<option value="">No kind</option>
						{Object.entries(KNOWLEDGE_KIND_LABELS).map(([value, text]) => (
							<option key={value} value={value}>{text}</option>
						))}
					</select>

					<label className={label} htmlFor="body">What it is</label>
					<textarea className={textarea} id="body" name="body" rows={3} placeholder="What is this, and why does it come easily to you?" />

					<label className={label} htmlFor="evidence">Evidence</label>
					<textarea className={textarea} id="evidence" name="evidence" rows={3} placeholder="What proves you have it? Things you've built, been asked for, lost time to." />

					<PopupActions onCancel={close} submitLabel="Add card" />
				</form>
			)}
		</Popup>
	);
}
