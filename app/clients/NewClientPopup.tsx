'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label } from '@/components/ui';

export function NewClientPopup() {
	return (
		<Popup title="New client" trigger={(open) => <button type="button" className={btn} onClick={open}>+ New client</button>}>
			{(close) => (
				<form method="post" action="/api/clients/create">
					<label className={label} htmlFor="name">Name</label>
					<input className={input} id="name" name="name" type="text" required maxLength={160} />

					<label className={label} htmlFor="company">Company</label>
					<input className={input} id="company" name="company" type="text" maxLength={160} />

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className={label} htmlFor="email">Email</label>
							<input className={input} id="email" name="email" type="email" />
						</div>
						<div>
							<label className={label} htmlFor="phone">Phone</label>
							<input className={input} id="phone" name="phone" type="tel" />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className={label} htmlFor="stage">Stage</label>
							<select className={input} id="stage" name="stage">
								<option value="lead">Lead</option>
								<option value="contacted">Contacted</option>
								<option value="negotiating">Negotiating</option>
								<option value="won">Won</option>
								<option value="lost">Lost</option>
							</select>
						</div>
						<div>
							<label className={label} htmlFor="next_follow_up">Next follow-up</label>
							<input className={input} id="next_follow_up" name="next_follow_up" type="date" />
						</div>
					</div>

					<PopupActions onCancel={close} submitLabel="Add client" />
				</form>
			)}
		</Popup>
	);
}
