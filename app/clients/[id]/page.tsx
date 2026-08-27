import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import type { Client, ClientNote, ClientStage } from '@/lib/clients';
import { btnGhost, cx, Empty, FormError, Pill } from '@/components/ui';
import { NewNotePopup } from './NewNotePopup';

const STAGE_LABELS: Record<ClientStage, string> = {
	lead: 'Lead',
	contacted: 'Contacted',
	negotiating: 'Negotiating',
	won: 'Won',
	lost: 'Lost',
};

const FIELD = 'h-10 px-3 font-sans text-base text-ink bg-canvas border border-line rounded-full outline-none w-full md:w-auto focus:border-ink';

export default async function ClientDetailPage({
	params, searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ error?: string }>;
}) {
	const { supabase } = await requireOwner();
	const [{ id }, { error }] = await Promise.all([params, searchParams]);

	const { data: client } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
	if (!client) redirect('/clients');

	const typed = client as Client;

	const { data: notes } = await supabase
		.from('client_notes')
		.select('*')
		.eq('client_id', id)
		.order('created_at', { ascending: false });

	const typedNotes = (notes ?? []) as ClientNote[];

	return (
		<section className="max-w-[720px]">
			<Link href="/clients" className="inline-block mb-6 text-[13px] text-muted no-underline hover:text-ink">← Clients</Link>

			<div className="flex items-center gap-3.5 flex-wrap">
				<h1 className="m-0 font-serif text-[clamp(1.9rem,4vw,2.6rem)] font-semibold tracking-[-0.02em]">{typed.name}</h1>
				<Pill value={typed.stage}>{STAGE_LABELS[typed.stage]}</Pill>
			</div>

			{typed.company && <p className="mt-3 mb-0 max-w-[60ch] text-muted leading-relaxed">{typed.company}</p>}

			{(typed.email || typed.phone) && (
				<p className="mt-2 mb-0 text-sm text-muted">{[typed.email, typed.phone].filter(Boolean).join(' · ')}</p>
			)}

			{error && <FormError>{error}</FormError>}

			<form method="post" action={`/api/clients/${typed.id}/update`} className="flex gap-3.5 mt-8 flex-wrap items-stretch md:items-end">
				<div className="flex flex-col gap-1.5 flex-1 basis-40 md:flex-initial">
					<label htmlFor="stage" className="text-[13px] text-muted">Stage</label>
					<select id="stage" name="stage" className={FIELD} defaultValue={typed.stage}>
						<option value="lead">Lead</option>
						<option value="contacted">Contacted</option>
						<option value="negotiating">Negotiating</option>
						<option value="won">Won</option>
						<option value="lost">Lost</option>
					</select>
				</div>
				<div className="flex flex-col gap-1.5 flex-1 basis-40 md:flex-initial">
					<label htmlFor="next_follow_up" className="text-[13px] text-muted">Next follow-up</label>
					<input id="next_follow_up" name="next_follow_up" type="date" defaultValue={typed.next_follow_up ?? ''} className={FIELD} />
				</div>
				<button type="submit" className={cx(btnGhost, 'w-full md:w-auto')}>Update</button>
			</form>

			<div className="mt-14">
				<div className="flex items-center justify-between gap-3 flex-wrap mb-5">
					<h2 className="m-0 font-serif text-[22px] font-semibold">Notes</h2>
					<NewNotePopup clientId={typed.id} />
				</div>

				<div className="flex flex-col">
					{typedNotes.length ? (
						typedNotes.map((note) => (
							// group + group-last: the connector line is hidden on the last
							// entry so the timeline doesn't trail off into nothing.
							<div key={note.id} className="group flex gap-3 md:gap-[18px]">
								<div className="flex flex-col items-center shrink-0 w-3">
									<span className="w-3 h-3 rounded-full bg-ink border-2 border-paper shadow-[0_0_0_1px_var(--color-line)] mt-1.5" />
									<span className="flex-1 w-px bg-line mt-1 group-last:hidden" />
								</div>
								<div className="flex-1 pb-7">
									<span className="text-[13px] text-muted tabular-nums">{new Date(note.created_at).toLocaleString()}</span>
									<p className="mt-2 mb-0 text-[15px] leading-relaxed whitespace-pre-wrap">{note.note}</p>
								</div>
							</div>
						))
					) : (
						<Empty>No notes yet.</Empty>
					)}
				</div>
			</div>
		</section>
	);
}
