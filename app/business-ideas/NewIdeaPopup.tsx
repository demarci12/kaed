'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label, textarea } from '@/components/ui';

export function NewIdeaPopup() {
	return (
		<Popup title="Register idea" trigger={(open) => <button type="button" className={btn} onClick={open}>+ Register idea</button>}>
			{(close) => (
				<form method="post" action="/api/business-ideas/create">
					<label className={label} htmlFor="title">Title</label>
					<input className={input} id="title" name="title" type="text" required maxLength={160} />

					<label className={label} htmlFor="pain_point">Pain point</label>
					<textarea className={textarea} id="pain_point" name="pain_point" rows={2} placeholder="What problem does this solve, for whom?" />

					<label className={label} htmlFor="target_market">Target market</label>
					<textarea className={textarea} id="target_market" name="target_market" rows={2} placeholder="Who would pay for this?" />

					<label className={label} htmlFor="validation">Validation</label>
					<textarea className={textarea} id="validation" name="validation" rows={2} placeholder="What have you done to test this so far?" />

					<PopupActions onCancel={close} submitLabel="Register idea" />
				</form>
			)}
		</Popup>
	);
}
