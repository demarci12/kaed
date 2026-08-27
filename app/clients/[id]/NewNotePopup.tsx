'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btnGhost, textarea } from '@/components/ui';

export function NewNotePopup({ clientId }: { clientId: string }) {
	return (
		<Popup title="Add note" trigger={(open) => <button type="button" className={btnGhost} onClick={open}>+ Add note</button>}>
			{(close) => (
				<form method="post" action={`/api/clients/${clientId}/notes`}>
					<textarea className={textarea} name="note" rows={3} placeholder="What happened?" required />
					<PopupActions onCancel={close} submitLabel="Add note" />
				</form>
			)}
		</Popup>
	);
}
