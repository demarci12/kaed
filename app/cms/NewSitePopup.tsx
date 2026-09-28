'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label } from '@/components/ui';

/** Popup takes render-prop children, which cannot cross the server/client boundary -- so the form lives here. */
export function NewSitePopup() {
	return (
		<Popup title="Add site" trigger={(open) => <button type="button" className={btn} onClick={open}>+ Add site</button>}>
			{(close) => (
				<form method="post" action="/api/cms/sites/create">
					<label className={label} htmlFor="name">Name</label>
					<input id="name" name="name" type="text" required maxLength={80} placeholder="Kazánszerelők" className={input} />

					<label className={label} htmlFor="domain">Domain</label>
					<input id="domain" name="domain" type="text" maxLength={120} placeholder="kazanszerelok.hu" className={input} />

					<label className={label} htmlFor="language">Content language</label>
					<select id="language" name="language" defaultValue="hu" className={input}>
						<option value="hu">Hungarian</option>
						<option value="en">English</option>
						<option value="de">German</option>
					</select>

					<PopupActions onCancel={close} submitLabel="Add site" />
				</form>
			)}
		</Popup>
	);
}
