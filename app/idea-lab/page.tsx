import { requireOwner } from '@/lib/auth';
import { getOrCreateWorksheet } from '@/lib/idea-lab-worksheet';
import { FormError, PageHead } from '@/components/ui';
import { PlaybookSection, type PlaybookRow } from './PlaybookSection';
import { ThinkingSpace } from './ThinkingSpace';

/**
 * One page: a free-form thinking space on top, the playbook underneath as
 * reference (every section is itself an editable text input). No steps, no
 * views, no sub-pages.
 */
export default async function IdeaLabPage() {
	const { supabase, user } = await requireOwner();
	const [lab, { data: rows }] = await Promise.all([
		getOrCreateWorksheet(supabase, user.id),
		supabase.from('idea_lab_playbook').select('id, title, body, notes').order('position', { ascending: true }),
	]);
	const sections = (rows ?? []) as PlaybookRow[];

	return (
		<section className="max-w-[860px]">
			<PageHead
				eyebrow="Personal"
				title="Idea Lab."
				lede="A space to think, with the playbook for finding pain points and business opportunities right below it. Everything on the page is editable and saves as you go."
			/>

			{lab ? (
				<div className="mt-8">
					<h2 className="mt-0 mb-3 font-serif text-2xl font-semibold tracking-[-0.01em]">Thinking space</h2>
					<ThinkingSpace id={lab.id} initial={lab.thinking ?? ''} />
				</div>
			) : (
				<FormError>Could not open your thinking space. Reload to try again.</FormError>
			)}

			<div className="mt-16 pt-10 border-t border-line">
				<p className="mt-0 mb-8 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">Playbook</p>
				<div className="flex flex-col gap-16">
					{sections.length
						? sections.map((row, i) => <PlaybookSection key={row.id} row={row} index={i} />)
						: <p className="text-sm text-muted">No playbook text yet.</p>}
				</div>
			</div>
		</section>
	);
}
