import { InlineEdit } from '@/components/InlineEdit';
import { btnGhost, cardLabel, cardValue } from '@/components/ui';
import type { PainPoint } from '@/lib/painhunter';
import { IdeaLinks, type LinkedIdea } from './IdeaLinks';

const ENDPOINT = '/api/painhunter';

function Field({ label, field, pain, value }: { label: string; field: string; pain: PainPoint; value: string | null }) {
	return (
		<div className="min-w-0">
			<span className={cardLabel}>{label}</span>
			<InlineEdit value={value ?? ''} field={field} id={pain.id} endpoint={ENDPOINT} kind="textarea" className={`block ${cardValue}`} />
		</div>
	);
}

/**
 * The part of a pain that doesn't fit on one line: the long text fields, the
 * date and the idea links. Shared by the table's detail line and the mobile
 * card's collapsible section, so both always offer the same edits.
 */
export function PainDetails({ pain, linked, linkOptions }: {
	pain: PainPoint;
	linked: LinkedIdea[];
	linkOptions: { id: string; title: string }[];
}) {
	return (
		<>
			<div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
				<Field label="What happens" field="details" pain={pain} value={pain.details} />
				<Field label="Who has it" field="who" pain={pain} value={pain.who} />
				<Field label="How it is handled today" field="workaround" pain={pain} value={pain.workaround} />
			</div>
			<div className="mt-4 flex flex-wrap items-start gap-x-10 gap-y-4">
				<div>
					<span className={cardLabel}>Noticed on</span>
					<div className="mt-1.5">
						<InlineEdit
							value={pain.noticed_on}
							field="noticed_on"
							id={pain.id}
							endpoint={ENDPOINT}
							kind="date"
							className="inline-block text-sm text-ink tabular-nums"
						/>
					</div>
				</div>
				<div className="min-w-0 flex-1 basis-64">
					<span className={cardLabel}>Business ideas</span>
					<div className="mt-1.5">
						<IdeaLinks painId={pain.id} linked={linked} options={linkOptions} />
					</div>
				</div>
				{linked.length === 0 && (
					<form method="post" action={`${ENDPOINT}/${pain.id}/promote`} className="m-0 self-end">
						<button type="submit" className={btnGhost}>→ Make it a business idea</button>
					</form>
				)}
			</div>
		</>
	);
}
