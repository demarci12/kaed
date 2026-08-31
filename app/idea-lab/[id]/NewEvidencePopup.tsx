'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btnGhost, input, label, textarea } from '@/components/ui';

export function NewEvidencePopup({ candidateId }: { candidateId: string }) {
	return (
		<Popup
			title="Log a finding"
			trigger={(open) => <button type="button" className={btnGhost} onClick={open}>+ Log finding</button>}
		>
			{(close) => (
				<form method="post" action={`/api/idea-lab/${candidateId}/evidence`}>
					<label className={label} htmlFor="problem">Problem</label>
					<textarea id="problem" className={textarea} name="problem" rows={2} placeholder="What are people struggling with?" required />

					<label className={label} htmlFor="source">Source</label>
					<input id="source" className={input} name="source" type="text" placeholder="r/freelance" />

					<label className={label} htmlFor="permalink">Link</label>
					<input id="permalink" className={input} name="permalink" type="url" placeholder="https://reddit.com/…" />

					<label className={label} htmlFor="engagement">Engagement</label>
					<input id="engagement" className={input} name="engagement" type="text" placeholder="500 upvotes, 100 comments" />

					<label className={label} htmlFor="found_on">Date found</label>
					<input id="found_on" className={input} name="found_on" type="date" />

					<label className={label} htmlFor="quote">Quote</label>
					<textarea id="quote" className={textarea} name="quote" rows={2} placeholder="Direct quote from the thread" />

					<PopupActions onCancel={close} submitLabel="Log finding" />
				</form>
			)}
		</Popup>
	);
}
