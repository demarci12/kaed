'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label } from '@/components/ui';

export function NewPagePopup({ defaultTitle }: { defaultTitle?: string }) {
	return (
		<Popup
			title="New page"
			defaultOpen={!!defaultTitle}
			trigger={(open) => <button type="button" className={btn} onClick={open}>+ New page</button>}
		>
			{(close) => (
				<form method="post" action="/api/think-pad/create">
					<label className={label} htmlFor="title">Title</label>
					<input className={input} id="title" name="title" type="text" required maxLength={160} defaultValue={defaultTitle} autoFocus />
					<PopupActions onCancel={close} submitLabel="Create page" />
				</form>
			)}
		</Popup>
	);
}
