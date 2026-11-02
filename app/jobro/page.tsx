import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { createJobroReader, jobroConfigured } from '@/lib/jobro';
import { ACTIVE_DAYS, SEGMENTS, loadJobroOverview, type CompanyRow, type Overview, type Segment } from '@/lib/jobro-stats';
import {
	card, chip, chipActive, chipMuted, cx, Empty, FormError, PageHead, table, tableWrap, td, tdNum, th, thNum,
} from '@/components/ui';

export const dynamic = 'force-dynamic';

const BUDAPEST = 'Europe/Budapest';
const fmt = (n: number) => n.toLocaleString('hu-HU');
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('hu-HU', { dateStyle: 'medium', timeZone: BUDAPEST }) : '—');

/** "today", "3 d ago", "—" -- how stale a timestamp is, which is what the table is for. */
function ago(iso: string | null, now: number): string {
	if (!iso) return '—';
	const days = Math.floor((now - new Date(iso).getTime()) / 86_400_000);
	if (days <= 0) return 'today';
	if (days === 1) return 'yesterday';
	return `${days} d ago`;
}

const BAD_STATUS = new Set(['past_due', 'suspended']);

export default async function JobroPage({ searchParams }: { searchParams: Promise<{ segment?: string; status?: string }> }) {
	await requireOwner();
	const params = await searchParams;

	const head = (
		<PageHead
			eyebrow="Jobro"
			title="Customers & usage."
			lede="Who has signed up to jobro.hu, who is still using it, and how much. Read-only: this page can look at Jobro's database but never change it."
		/>
	);

	if (!jobroConfigured()) {
		return (
			<section className="max-w-[1080px]">
				{head}
				<div className={cx(card, 'mt-10')}>
					<h2 className="m-0 font-serif text-[19px] font-semibold">Connect Jobro</h2>
					<p className="m-0 text-sm text-muted leading-relaxed">
						Add these two server-side environment variables (Vercel project settings, and <code>.env</code> locally), then reload.
						Use the Supabase project that jobro.hu runs on — Project Settings → API.
					</p>
					<pre className="m-0 p-3 rounded-lg bg-canvas border border-line text-xs overflow-x-auto">{'JOBRO_SUPABASE_URL=https://<project>.supabase.co\nJOBRO_SUPABASE_SERVICE_ROLE_KEY=<service_role key>'}</pre>
					<p className="m-0 text-xs text-muted">Neither is <code>NEXT_PUBLIC_</code>, so neither reaches the browser.</p>
				</div>
			</section>
		);
	}

	let overview: Overview | null = null;
	let error: string | null = null;
	try {
		overview = await loadJobroOverview(createJobroReader());
	} catch (e) {
		error = e instanceof Error ? e.message : 'Could not read Jobro.';
	}

	if (!overview) {
		return (
			<section className="max-w-[1080px]">
				{head}
				<FormError>{error}</FormError>
			</section>
		);
	}

	const now = new Date(overview.generatedAt).getTime();
	const t = overview.totals;
	const segment = SEGMENTS.find((s) => s.id === params.segment)?.id as Segment | undefined;
	const status = params.status && params.status in t.byStatus ? params.status : undefined;

	const rows = overview.companies.filter((c) => (!segment || c.segment === segment) && (!status || (c.status ?? 'no subscription') === status));
	const href = (next: { segment?: string; status?: string }) => {
		const q = new URLSearchParams();
		const s = 'segment' in next ? next.segment : segment;
		const st = 'status' in next ? next.status : status;
		if (s) q.set('segment', s);
		if (st) q.set('status', st);
		const qs = q.toString();
		return qs ? `/jobro?${qs}` : '/jobro';
	};

	return (
		<section className="max-w-[1080px]">
			{head}

			<div className="mt-10 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
				<Stat label="Companies" value={fmt(t.companies)} sub={`${fmt(t.newCompanies7d)} new in 7 days · ${fmt(t.newCompanies30d)} in 30`} />
				<Stat label={`Active (${ACTIVE_DAYS} days)`} value={fmt(t.activeCompanies7d)} sub={`${fmt(t.activeCompanies30d)} in the last 30 days`} />
				<Stat label="Users" value={fmt(t.users)} sub={`${fmt(t.activeUsers7d)} signed in this week · ${fmt(t.activeUsers30d)} this month`} />
				<Stat label="Trials" value={fmt(t.byStatus.trialing ?? 0)} sub={`${fmt(t.trialsEndingSoon)} ending within 7 days · ${fmt(t.trialsExpired)} expired`} />
				<Stat label="Paying" value={fmt(t.byStatus.active ?? 0)} sub={`${fmt(t.byStatus.past_due ?? 0)} past due · ${fmt(t.byStatus.suspended ?? 0)} suspended`} />
			</div>
			<p className="mt-3 mb-0 text-xs text-muted leading-relaxed">
				“Active” counts a company when anyone signed in or created a job, quote, invoice or AI request. Users are counted by last sign-in only, which does not move while a
				session stays open — read “signed in” as a floor, not the true number of people at work.
			</p>

			<div className="mt-8 flex flex-col gap-2.5">
				<div className="flex items-center gap-1.5 flex-wrap">
					<Link href={href({ segment: undefined })} className={!segment ? chipActive : chip}>All · {fmt(t.companies)}</Link>
					{SEGMENTS.map((s) => (
						<Link key={s.id} href={href({ segment: s.id })} title={s.hint} className={segment === s.id ? chipActive : chip}>
							{s.label} · {fmt(t.bySegment[s.id])}
						</Link>
					))}
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					<Link href={href({ status: undefined })} className={!status ? chipActive : chip}>Any plan status</Link>
					{Object.entries(t.byStatus).sort(([, a], [, b]) => b - a).map(([s, n]) => (
						<Link key={s} href={href({ status: s })} className={status === s ? chipActive : chip}>{s.replace('_', ' ')} · {fmt(n)}</Link>
					))}
				</div>
			</div>

			<div className={cx(tableWrap, 'mt-5')}>
				<table className={table}>
					<thead>
						<tr>
							<th className={th}>Company</th>
							<th className={th}>Plan</th>
							<th className={thNum}>Users</th>
							<th className={th}>Last activity</th>
							<th className={thNum}>Jobs 30d</th>
							<th className={thNum}>Quotes 30d</th>
							<th className={thNum}>Invoices 30d</th>
							<th className={thNum}>AI 30d</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((c) => <CompanyLine key={c.id} c={c} now={now} />)}
					</tbody>
				</table>
				{rows.length === 0 && <Empty>No companies match.</Empty>}
			</div>
			<p className="mt-3 mb-0 text-xs text-muted">Sorted by most recent activity. Counts cover the last 30 days. Loaded {new Date(overview.generatedAt).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: BUDAPEST })}.</p>
		</section>
	);
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
	return (
		<div className={card}>
			<span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-muted">{label}</span>
			<span className="font-serif text-[32px] font-semibold leading-none tabular-nums">{value}</span>
			<span className="text-xs text-muted leading-snug">{sub}</span>
		</div>
	);
}

function CompanyLine({ c, now }: { c: CompanyRow; now: number }) {
	const bad = c.status !== null && BAD_STATUS.has(c.status);
	return (
		<tr>
			<td className={td}>
				<div className="font-medium text-ink">{c.name}</div>
				<div className="text-xs text-muted">{c.ownerEmail ?? 'no owner'} · since {day(c.createdAt)}</div>
			</td>
			<td className={td}>
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className={chipMuted}>{c.plan}</span>
					<span className={cx(chipMuted, bad && 'text-[--color-negative] border-[--color-negative-line]')}>{(c.status ?? 'no subscription').replace('_', ' ')}</span>
				</div>
				{c.status === 'trialing' && c.trialEndsAt && (
					<div className={cx('text-xs mt-1', c.trialExpired ? 'text-[--color-negative]' : 'text-muted')}>
						{c.trialExpired ? 'trial ended' : 'trial ends'} {day(c.trialEndsAt)}
					</div>
				)}
				{c.cancelAtPeriodEnd && <div className="text-xs mt-1 text-muted">cancels {day(c.periodEnd)}</div>}
			</td>
			<td className={tdNum}>
				{c.users}
				<div className="text-xs text-muted">{c.activeUsers30d} signed in (30d)</div>
			</td>
			<td className={td}>
				<span className={cx('tabular-nums', c.segment === 'dormant' && 'text-muted')}>{ago(c.lastActivityAt, now)}</span>
				<div className="text-xs text-muted">{c.segment}</div>
			</td>
			<td className={tdNum}>{c.jobs30}</td>
			<td className={tdNum}>{c.quotes30}</td>
			<td className={tdNum}>{c.invoices30}</td>
			<td className={tdNum}>{c.aiCredits30}</td>
		</tr>
	);
}
