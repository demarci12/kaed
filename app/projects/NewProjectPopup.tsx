'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label, textarea } from '@/components/ui';

/**
 * Popup takes render-prop children, which a Server Component cannot pass
 * across the boundary -- so each popup lives in its own client wrapper.
 */
export function NewProjectPopup() {
	return (
		<Popup title="New project" trigger={(open) => <button type="button" className={btn} onClick={open}>+ New project</button>}>
			{(close) => (
				<form method="post" action="/api/projects/create">
					<label className={label} htmlFor="title">Title</label>
					<input className={input} id="title" name="title" type="text" required maxLength={120} />

					<label className={label} htmlFor="description">Description</label>
					<textarea className={textarea} id="description" name="description" rows={3} />

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className={label} htmlFor="start_date">Start date</label>
							<input className={input} id="start_date" name="start_date" type="date" />
						</div>
						<div>
							<label className={label} htmlFor="target_end_date">Target end date</label>
							<input className={input} id="target_end_date" name="target_end_date" type="date" />
						</div>
					</div>

					<PopupActions onCancel={close} submitLabel="Create project" />
				</form>
			)}
		</Popup>
	);
}
