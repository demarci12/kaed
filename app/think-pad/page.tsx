import Link from 'next/link';
import { FilterSelect } from '@/components/FilterSelect';
import { chip, chipActive, PageHead } from '@/components/ui';
import { requireOwner } from '@/lib/auth';
import { ALL_STEPS, progress, type Answer, type Status } from '@/lib/playbook';
import { Playbook } from './Playbook';

type AnswerRow = { run_id: string; step: number; status: Status; note: string | null; data: Record<string, number> | null };

const shorten = (s: string, max = 48) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

export default async function ThinkPadPage({ searchParams }: { searchParams: Promise<{ idea?: string }> }) {
	const { supabase } = await requireOwner();
	const sp = await searchParams;

	const [{ data: ideaRows }, { data: runRows }, { data: answerRows }] = await Promise.all([
		supabase.from('business_ideas').select('id, title').is('archived_at', null).order('rank', { ascending: true }),
		supabase.from('playbook_runs').select('id, idea_id'),
		supabase.from('playbook_answers').select('run_id, step, status, note, data'),
	]);

	const ideas = (ideaRows ?? []) as { id: string; title: string }[];
	const runs = (runRows ?? []) as { id: string; idea_id: string | null }[];

	const byRun = new Map<string, Record<number, Answer>>();
	for (const a of (answerRows ?? []) as AnswerRow[]) {
		const run = byRun.get(a.run_id) ?? {};
		run[a.step] = { status: a.status, note: a.note ?? '', data: a.data };
		byRun.set(a.run_id, run);
	}
	const answersOf = (runId: string | undefined) => (runId ? byRun.get(runId) : undefined) ?? {};

	const youRunId = runs.find((r) => !r.idea_id)?.id;
	const runIdByIdea = new Map(runs.filter((r) => r.idea_id).map((r) => [r.idea_id as string, r.id]));
	const you = answersOf(youRunId);

	const youSteps = ALL_STEPS.filter((s) => s.scope === 'you');
	const ideaSteps = ALL_STEPS.filter((s) => s.scope === 'idea');
	const youProgress = progress(youSteps, you);
	const ideaProgress = (id: string) => progress(ideaSteps, answersOf(runIdByIdea.get(id)));

	const selected = ideas.find((i) => i.id === sp.idea) ?? null;
	const href = (id?: string) => (id ? `/think-pad?idea=${id}` : '/think-pad');

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Think Pad."
				lede="A step-by-step business starter. First you: your limits, advantages and people. Then one idea at a time, from problem to paying customers. Every step is a status and a note; what you write once feeds the steps that build on it."
			/>

			<div className="mt-6 flex flex-wrap items-center gap-2">
				<Link href={href()} className={selected ? chip : chipActive}>You · {youProgress.done}/{youProgress.total}</Link>
				<FilterSelect
					label="Business idea"
					active={Boolean(selected)}
					value={href(selected?.id)}
					options={[
						{ href: href(), label: ideas.length ? 'Work on an idea…' : 'No business ideas yet' },
						...ideas.map((i) => {
							const p = ideaProgress(i.id);
							return { href: href(i.id), label: `${shorten(i.title)} · ${p.done}/${p.total}` };
						}),
					]}
				/>
				{selected && (
					<Link href={`/business-ideas/${selected.id}`} className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
						Open the idea ↗
					</Link>
				)}
			</div>

			{selected && <h2 className="mb-0 mt-4 font-serif text-xl font-semibold leading-snug">{selected.title}</h2>}

			<Playbook
				key={selected?.id ?? 'you'}
				scope={selected ? 'idea' : 'you'}
				ideaId={selected?.id ?? null}
				initial={selected ? answersOf(runIdByIdea.get(selected.id)) : you}
				you={you}
			/>
		</section>
	);
}
