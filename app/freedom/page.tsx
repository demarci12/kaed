import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import {
	budgetedFor, freedomSnapshot, HUF_PER_USD,
	type FinanceBudget, type FinanceCategory, type FinanceLimits, type FinanceTransaction,
} from '@/lib/finance';
import type { Project } from '@/lib/projects';
import { InlineEdit } from '@/components/InlineEdit';
import { cx, table, tableWrap, td, th, FormError, PageHead, Pill } from '@/components/ui';

// `projects.mrr` exists in the schema but not (yet) on the Project interface
// in lib/projects.ts, which this page does not own.
type ProjectWithMrr = Project & { mrr: number | null };

const huf = (n: number) => Math.round(n).toLocaleString('hu-HU');
const usd = (n: number) => `$${Math.round(n / HUF_PER_USD).toLocaleString('en-US')}`;
const monthsLabel = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)} months`);

const big = 'm-0 mt-1.5 font-serif text-[clamp(28px,5vw,44px)] font-semibold tracking-[-0.02em] leading-[1.05] tabular-nums';
const sub = 'm-0 mt-1 text-[13px] text-muted tabular-nums';
const tile = 'p-[18px] border border-line rounded-[14px] bg-paper';
const tileValue = 'm-0 mt-1.5 font-serif text-[26px] font-semibold tracking-[-0.01em] tabular-nums';
const fieldLabel = 'text-[11px] font-semibold tracking-[0.06em] uppercase text-muted';
const note = 'm-0 mb-4 text-sm text-muted';

export default async function FreedomPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireUser();
	const sp = await searchParams;

	const currentMonth = new Date().toISOString().slice(0, 7);

	// One round trip, not five -- see the Promise.all rule in CLAUDE.md.
	const [{ data: categories }, { data: budgets }, { data: limits }, { data: transactions }, { data: projects }] =
		await Promise.all([
			supabase.from('finance_categories').select('*'),
			supabase.from('finance_budgets').select('*').eq('month', `${currentMonth}-01`),
			supabase.from('finance_limits').select('*').maybeSingle(),
			supabase.from('finance_transactions').select('*'),
			supabase.from('projects').select('*').order('mrr', { ascending: false }),
		]);

	const typedCategories = (categories ?? []) as FinanceCategory[];
	const typedBudgets = (budgets ?? []) as FinanceBudget[];
	const typedTransactions = (transactions ?? []) as FinanceTransaction[];
	const typedProjects = (projects ?? []) as ProjectWithMrr[];
	const typedLimits = limits as FinanceLimits | null;

	const budgetByCategoryId = new Map(typedBudgets.map((b) => [b.category_id, { amount: Number(b.amount) }]));
	const plannedFor = (type: string) =>
		typedCategories.filter((c) => c.type === type).reduce((sum, c) => sum + budgetedFor(c, budgetByCategoryId), 0);

	// Savings uses the same definition as /finance: the starting balance plus
	// every saving-type transaction ever logged.
	const savings =
		Number(typedLimits?.starting_savings_balance ?? 0) +
		typedTransactions.filter((t) => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0);

	// Only projects you're actually running count toward MRR. A 'done' or
	// 'not_started' project charging money would be a data-entry mistake, and
	// counting it would quietly inflate the one number that matters.
	const currentMrr = typedProjects
		.filter((p) => p.status === 'active')
		.reduce((sum, p) => sum + Number(p.mrr ?? 0), 0);

	const snap = freedomSnapshot({
		plannedExpense: plannedFor('expense'),
		plannedIncome: plannedFor('income'),
		targetMrr: typedLimits?.mrr_target != null ? Number(typedLimits.mrr_target) : null,
		currentMrr,
		savings,
	});

	// Logged expenses per month so far, as a reality check against the plan --
	// a large gap means the plan is aspirational, not that the app is wrong.
	const expenseMonths = new Set(
		typedTransactions.filter((t) => t.type === 'expense').map((t) => t.occurred_on.slice(0, 7)),
	);
	const loggedExpenseTotal = typedTransactions
		.filter((t) => t.type === 'expense')
		.reduce((sum, t) => sum + Number(t.amount), 0);
	const loggedMonthlyBurn = expenseMonths.size ? loggedExpenseTotal / expenseMonths.size : null;

	// Ladder markers, positioned along the same axis as the progress bar so the
	// survive and replace lines read against the target rather than floating.
	const ladder = [
		{ label: 'Survive', sub: 'covers planned expenses', value: snap.surviveMrr },
		{ label: 'Replace', sub: 'matches planned income', value: snap.replaceMrr },
		{ label: 'Target', sub: 'your quit number', value: snap.targetMrr },
	].sort((a, b) => a.value - b.value);

	const barMax = Math.max(snap.targetMrr, snap.replaceMrr, snap.surviveMrr, snap.currentMrr, 1);

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="The point"
				title="Freedom."
				lede="What the projects earn, against what the life costs. Everything else in here is a means to move this one bar."
			/>

			{sp.error && <FormError>{sp.error}</FormError>}

			<div className="mt-8 p-7 border border-line rounded-2xl bg-paper">
				<div className="flex items-baseline justify-between gap-4 flex-wrap">
					<div>
						<span className={fieldLabel}>Current MRR</span>
						<p className={big}>
							{huf(snap.currentMrr)} <span className="text-[0.45em] font-medium text-muted tracking-normal">HUF</span>
						</p>
						<p className={sub}>{usd(snap.currentMrr)} / month</p>
					</div>
					<div className="text-right">
						<span className={fieldLabel}>Quit at</span>
						<p className={big}>
							<InlineEdit
								value={String(snap.targetMrr)}
								field="mrr_target"
								id={typedLimits?.id ?? ''}
								endpoint="/api/finance/limits"
								kind="number"
								display={huf(snap.targetMrr)}
							/>
						</p>
						<p className={sub}>{usd(snap.targetMrr)} / month</p>
					</div>
				</div>

				{/* The bar is the whole page in one element: the fill is progress,
				    the markers are the survive/replace/target rungs on one axis. */}
				<div
					role="img"
					aria-label={`${Math.round(snap.progress * 100)} percent of target`}
					className="relative h-3.5 mt-6 border border-line rounded-full bg-canvas overflow-hidden"
				>
					<div className="h-full bg-ink rounded-full transition-[width] duration-300" style={{ width: `${snap.progress * 100}%` }} />
					{ladder.map((step) => (
						<span
							key={step.label}
							title={`${step.label}: ${huf(step.value)} HUF`}
							className="absolute top-0 bottom-0 w-0.5 bg-muted opacity-55 -translate-x-px"
							style={{ left: `${Math.min((step.value / barMax) * 100, 100)}%` }}
						/>
					))}
				</div>
				<p className="mt-2.5 mb-0 text-[13px] text-muted">
					{Math.round(snap.progress * 100)}% of the way there
					{snap.currentMrr === 0 && ' — nothing is charging money yet'}
				</p>
			</div>

			<div className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-3.5 mt-4">
				<div className={tile}>
					<span className={fieldLabel}>Runway</span>
					<p className={tileValue}>{monthsLabel(snap.runwayMonths)}</p>
					<p className={sub}>{huf(snap.savings)} HUF saved, zero income</p>
				</div>
				<div className={tile}>
					<span className={fieldLabel}>Leverage</span>
					<p className={tileValue}>{snap.leverage == null ? '—' : `${snap.leverage.toFixed(1)}×`}</p>
					<p className={sub}>
						{snap.leverage == null ? 'No surplus planned this month' : 'months of runway bought per month worked'}
					</p>
				</div>
				<div className={tile}>
					<span className={fieldLabel}>Gap to close</span>
					<p className={tileValue}>{huf(Math.max(snap.targetMrr - snap.currentMrr, 0))}</p>
					<p className={sub}>{usd(Math.max(snap.targetMrr - snap.currentMrr, 0))} / month still missing</p>
				</div>
			</div>

			<div className="mt-11">
				<h2 className="m-0 mb-1.5 font-serif text-xl font-semibold tracking-[-0.01em]">The ladder</h2>
				<p className={note}>Three places you could stop. You picked the top one.</p>
				<div className={tableWrap}>
					<table className={table}>
						<thead>
							<tr>
								<th className={th}>Rung</th>
								<th className={th}>HUF / month</th>
								<th className={th}>USD</th>
								<th className={th}>Covered by MRR?</th>
							</tr>
						</thead>
						<tbody>
							{ladder.map((step) => (
								<tr key={step.label}>
									<td className={td}>
										<strong>{step.label}</strong>
										<span className={cx(sub, 'block')}>{step.sub}</span>
									</td>
									<td className={cx(td, 'tabular-nums')}>{huf(step.value)}</td>
									<td className={cx(td, 'tabular-nums text-muted')}>{usd(step.value)}</td>
									<td className={td}>
										{snap.currentMrr >= step.value && step.value > 0
											? <Pill value="done">Yes</Pill>
											: <Pill value="not_started">Not yet</Pill>}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{loggedMonthlyBurn != null && (
					<p className={cx(note, 'mt-3 mb-0')}>
						Reality check: you&apos;ve logged {huf(loggedMonthlyBurn)} HUF/month of actual spend across{' '}
						{expenseMonths.size} month{expenseMonths.size === 1 ? '' : 's'}, against a plan of{' '}
						{huf(snap.surviveMrr)}. {loggedMonthlyBurn < snap.surviveMrr * 0.8
							? 'Either the plan is padded or the logging is incomplete.'
							: 'Plan and reality agree.'}
					</p>
				)}
			</div>

			<div className="mt-11">
				<h2 className="m-0 mb-1.5 font-serif text-xl font-semibold tracking-[-0.01em]">Where the money comes from</h2>
				<p className={note}>Only active projects count. Click a number to set it.</p>
				<div className={tableWrap}>
					<table className={table}>
						<thead>
							<tr>
								<th className={th}>Project</th>
								<th className={th}>Status</th>
								<th className={th}>MRR (HUF)</th>
								<th className={th}>Share of target</th>
							</tr>
						</thead>
						<tbody>
							{typedProjects.length ? typedProjects.map((project) => (
								<tr key={project.id}>
									<td className={td}>
										<Link href={`/projects/${project.id}`} className="font-serif text-base font-semibold text-ink no-underline hover:underline">
											{project.title}
										</Link>
									</td>
									<td className={td}>
										<Pill value={project.status}>{project.status.replace('_', ' ')}</Pill>
									</td>
									<td className={td}>
										<InlineEdit
											value={String(Number(project.mrr ?? 0))}
											field="mrr" id={project.id} endpoint="/api/projects" kind="number"
											className="tabular-nums" display={huf(Number(project.mrr ?? 0))}
										/>
									</td>
									<td className={cx(td, 'tabular-nums text-muted')}>
										{snap.targetMrr > 0 && project.status === 'active'
											? `${Math.round((Number(project.mrr ?? 0) / snap.targetMrr) * 100)}%`
											: '—'}
									</td>
								</tr>
							)) : (
								<tr>
									<td colSpan={4} className="py-7 px-4 text-muted">
										No projects yet. <Link href="/business-ideas" className="underline">Pick one of the 80 ideas</Link> and start it.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
