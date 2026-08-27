'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label, textarea } from '@/components/ui';

/**
 * Popup takes render-prop children, which cannot cross the server/client
 * boundary -- so the trigger and form live in this client wrapper.
 */
export function NewGoalPopup() {
	return (
		<Popup title="Register goal" trigger={(open) => <button type="button" className={btn} onClick={open}>+ Register goal</button>}>
			{(close) => (
				<form method="post" action="/api/goals/create">
					<label className={label} htmlFor="title">Title</label>
					<input className={input} id="title" name="title" type="text" required maxLength={160} />

					<label className={label} htmlFor="description">Description</label>
					<textarea className={textarea} id="description" name="description" rows={3} placeholder="What does reaching this look like?" />

					<PopupActions onCancel={close} submitLabel="Register goal" />
				</form>
			)}
		</Popup>
	);
}
