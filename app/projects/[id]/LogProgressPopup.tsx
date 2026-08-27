'use client';

import { useState } from 'react';
import { Popup, PopupActions } from '@/components/Popup';
import { btnGhost, input, label, textarea } from '@/components/ui';

/**
 * The Astro version toggled the proof fields with a document-delegated script.
 * React holds the selected proof type in state instead, so the fields can
 * never be left out of sync with the dropdown.
 */
export function LogProgressPopup({ projectId }: { projectId: string }) {
	const [proofType, setProofType] = useState('text');

	return (
		<Popup title="Log progress" trigger={(open) => <button type="button" className={btnGhost} onClick={open}>+ Log progress</button>}>
			{(close) => (
				<form method="post" action={`/api/projects/${projectId}/logs`} encType="multipart/form-data">
					<label className={label} htmlFor="note">Note</label>
					<textarea className={textarea} id="note" name="note" rows={3} required />

					<label className={label} htmlFor="signal_type">Signal</label>
					<select className={input} id="signal_type" name="signal_type">
						<option value="progress">Just progress — no external signal</option>
						<option value="customer_contact">Talked to a prospect</option>
						<option value="interest_expressed">Someone expressed interest</option>
						<option value="paid">Someone paid</option>
						<option value="rejected">Got a rejection</option>
					</select>

					<label className={label} htmlFor="proof_type">Proof</label>
					<select className={input} id="proof_type" name="proof_type" value={proofType} onChange={(e) => setProofType(e.target.value)}>
						<option value="text">Text only</option>
						<option value="link">Link</option>
						<option value="image">Image</option>
					</select>

					{proofType === 'link' && (
						<div>
							<label className={label} htmlFor="proof_link">Proof URL</label>
							<input className={input} id="proof_link" name="proof_link" type="url" placeholder="https://" />
						</div>
					)}

					{proofType === 'image' && (
						<div>
							<label className={label} htmlFor="proof_file">Proof image</label>
							<input className={input} id="proof_file" name="proof_file" type="file" accept="image/*" />
						</div>
					)}

					<PopupActions onCancel={close} submitLabel="Log progress" />
				</form>
			)}
		</Popup>
	);
}
